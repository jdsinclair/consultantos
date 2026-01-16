import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSource, updateSource, updateSourceContent, setSourceError } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const source = await getSource(params.id, user.id);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Update status to processing
    await updateSource(params.id, user.id, { processingStatus: "processing" });

    // Process based on type
    switch (source.type) {
      case "website":
        await processWebsite(params.id, source.clientId, user.id, source.url!);
        break;
      case "repo":
        await processRepo(params.id, source.clientId, user.id, source.url!);
        break;
      case "local_folder":
        // Local folders need special handling via desktop agent
        return NextResponse.json({
          message: "Local folder sync requires desktop agent",
          needsAgent: true,
        });
      default:
        return NextResponse.json({ error: "Source type does not support processing" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Processing started" });
  } catch (error) {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function processWebsite(sourceId: string, clientId: string | null, userId: string, url: string) {
  try {
    // Try to fetch sitemap first
    const sitemapUrl = new URL("/sitemap.xml", url).toString();
    let pages: string[] = [];

    try {
      const sitemapRes = await fetch(sitemapUrl);
      if (sitemapRes.ok) {
        const sitemapText = await sitemapRes.text();
        // Simple regex to extract URLs from sitemap
        const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g);
        if (urlMatches) {
          pages = urlMatches.map(match => match.replace(/<\/?loc>/g, "")).slice(0, 50); // Limit to 50 pages
        }
      }
    } catch {
      // No sitemap, just crawl the main page
      pages = [url];
    }

    if (pages.length === 0) {
      pages = [url];
    }

    // Fetch and extract content from each page
    const allContent: string[] = [];
    const metadata: { pages: { url: string; title: string }[] } = { pages: [] };

    for (const pageUrl of pages.slice(0, 20)) { // Limit to 20 pages for now
      try {
        const res = await fetch(pageUrl);
        const html = await res.text();

        // Simple HTML to text conversion
        const title = extractTitle(html);
        const content = extractTextContent(html);

        metadata.pages.push({ url: pageUrl, title });
        allContent.push(`# ${title}\nURL: ${pageUrl}\n\n${content}\n\n---\n`);
      } catch (e) {
        console.error(`Failed to fetch ${pageUrl}:`, e);
      }
    }

    const fullContent = allContent.join("\n");

    // Store content in database
    await updateSourceContent(sourceId, userId, fullContent);
    await updateSource(sourceId, userId, { metadata });

    // Generate embeddings for RAG (in background, don't block response)
    processSourceEmbeddings(sourceId, clientId, userId, false, fullContent, { type: 'website', url })
      .catch(err => console.error('Embedding generation failed:', err));

  } catch (error) {
    console.error("Website processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}

async function processRepo(sourceId: string, clientId: string | null, userId: string, url: string) {
  try {
    // Parse GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error("Invalid GitHub URL");
    }

    const [, owner, repo] = match;

    // Use GitHub API to get repo contents
    // Note: For private repos, would need user's GitHub token
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const contents = await res.json();
    const allContent: string[] = [];

    // Fetch README and key files
    for (const file of contents) {
      if (
        file.type === "file" &&
        (file.name.toLowerCase().includes("readme") ||
          file.name.endsWith(".md") ||
          file.name === "package.json")
      ) {
        try {
          const fileRes = await fetch(file.download_url);
          const fileContent = await fileRes.text();
          allContent.push(`# ${file.name}\n\n${fileContent}\n\n---\n`);
        } catch (e) {
          console.error(`Failed to fetch ${file.name}:`, e);
        }
      }
    }

    const fullContent = allContent.join("\n");

    // Store content in database
    await updateSourceContent(sourceId, userId, fullContent);
    await updateSource(sourceId, userId, {
      metadata: { owner, repo, files: contents.length },
    });

    // Generate embeddings for RAG
    processSourceEmbeddings(sourceId, clientId, userId, false, fullContent, { type: 'repo', owner, repo })
      .catch(err => console.error('Embedding generation failed:', err));

  } catch (error) {
    console.error("Repo processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "Untitled";
}

function extractTextContent(html: string): string {
  // Remove scripts, styles, and HTML tags
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000); // Limit per page
}
