"use client";

import { useState, useEffect } from "react";
import { Input } from "./input";
import { Phone } from "lucide-react";
import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
  getCountryCallingCode,
} from "libphonenumber-js";

const countries: { code: CountryCode; label: string }[] = [
  { code: "US", label: "US (+1)" },
  { code: "CA", label: "CA (+1)" },
  { code: "GB", label: "UK (+44)" },
  { code: "AU", label: "AU (+61)" },
  { code: "DE", label: "DE (+49)" },
  { code: "FR", label: "FR (+33)" },
  { code: "IN", label: "IN (+91)" },
  { code: "CN", label: "CN (+86)" },
  { code: "JP", label: "JP (+81)" },
  { code: "KR", label: "KR (+82)" },
  { code: "SG", label: "SG (+65)" },
  { code: "IL", label: "IL (+972)" },
  { code: "AE", label: "UAE (+971)" },
  { code: "NZ", label: "NZ (+64)" },
  { code: "IE", label: "IE (+353)" },
  { code: "NL", label: "NL (+31)" },
  { code: "ES", label: "ES (+34)" },
  { code: "IT", label: "IT (+39)" },
  { code: "BR", label: "BR (+55)" },
  { code: "MX", label: "MX (+52)" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string, formatted: string, country: CountryCode) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "US",
  placeholder = "(555) 123-4567",
  className,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [displayValue, setDisplayValue] = useState("");

  // Initialize display value from stored E.164 value
  useEffect(() => {
    if (value && !displayValue) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed) {
        setCountry(parsed.country || defaultCountry);
        setDisplayValue(parsed.formatNational());
      }
    }
  }, [value, defaultCountry, displayValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Try to parse as international format first (handles paste with +)
    if (input.includes("+") || input.length > 10) {
      const parsed = parsePhoneNumberFromString(input);
      if (parsed && parsed.isValid()) {
        const detectedCountry = parsed.country || country;
        setCountry(detectedCountry);
        setDisplayValue(parsed.formatNational());
        onChange(parsed.format("E.164"), parsed.formatNational(), detectedCountry);
        return;
      }
    }

    // Format as you type for the current country
    const formatter = new AsYouType(country);
    const formatted = formatter.input(input.replace(/[^\d]/g, ""));
    setDisplayValue(formatted);

    // Try to get E.164 format
    const parsed = parsePhoneNumberFromString(input, country);
    if (parsed) {
      onChange(
        parsed.format("E.164"),
        formatted,
        country
      );
    } else {
      // Store raw digits if not yet valid
      onChange(input.replace(/[^\d]/g, ""), formatted, country);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value as CountryCode;
    setCountry(newCountry);
    
    // Re-parse with new country
    if (displayValue) {
      const digits = displayValue.replace(/[^\d]/g, "");
      const parsed = parsePhoneNumberFromString(digits, newCountry);
      if (parsed) {
        const formatted = parsed.formatNational();
        setDisplayValue(formatted);
        onChange(parsed.format("E.164"), formatted, newCountry);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    
    // Try to parse pasted content as phone number
    const parsed = parsePhoneNumberFromString(pasted);
    if (parsed && parsed.isValid()) {
      e.preventDefault();
      const detectedCountry = parsed.country || country;
      setCountry(detectedCountry);
      const formatted = parsed.formatNational();
      setDisplayValue(formatted);
      onChange(parsed.format("E.164"), formatted, detectedCountry);
    }
    // If not valid, let the normal onChange handle it
  };

  return (
    <div className="flex gap-2">
      <div className="relative">
        <select
          className="flex h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none cursor-pointer"
          value={country}
          onChange={handleCountryChange}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <Input
        type="tel"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onPaste={handlePaste}
        className={className}
      />
    </div>
  );
}
