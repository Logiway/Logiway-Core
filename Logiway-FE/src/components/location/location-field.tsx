import { LoaderCircle, MapPin } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import type { LocationSuggestion } from "../../types/index.ts";

interface LocationFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  suggestions: LocationSuggestion[];
  isOpen: boolean;
  isSearching: boolean;
  error: string | null;
  validationError: string | null;
  hasSearched: boolean;
  onChange: (value: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
}

export function LocationField({
  id,
  label,
  placeholder,
  value,
  suggestions,
  isOpen,
  isSearching,
  error,
  validationError,
  hasSearched,
  onChange,
  onOpenChange,
  onSelect,
}: LocationFieldProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = `${id}-suggestions`;
  const validationId = `${id}-validation-error`;
  const providerStatusId = `${id}-provider-status`;
  const providerMessage =
    error ??
    (hasSearched && !isSearching && suggestions.length === 0
      ? "Lokasi tidak ditemukan"
      : null);
  const visibleMessage = validationError ?? providerMessage;
  const visibleMessageId = validationError ? validationId : providerStatusId;
  const selectedIndex = Math.min(activeIndex, Math.max(suggestions.length - 1, 0));
  const activeOptionId =
    isOpen && suggestions.length > 0
      ? `${id}-option-${selectedIndex}`
      : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setActiveIndex(0);
    onChange(event.target.value);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onOpenChange(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        onOpenChange(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[selectedIndex];
      if (suggestion) {
        onSelect(suggestion);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-2 pb-5" onBlur={handleBlur}>
      <label className="text-sm font-semibold text-slate-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-cyan-600"
        />
        <input
          id={id}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-10 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20"
          type="text"
          role="combobox"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={isOpen ? listId : undefined}
          aria-describedby={visibleMessage ? visibleMessageId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(validationError || error)}
          onFocus={() => onOpenChange(suggestions.length > 0)}
        />
        {isSearching && (
          <LoaderCircle
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-blue-600 motion-reduce:animate-none"
          />
        )}
      </div>
      {visibleMessage && (
        <p
          id={visibleMessageId}
          className={
            validationError || error
              ? "absolute right-0 bottom-0 left-0 z-40 text-xs font-medium leading-4 text-red-600"
              : "absolute right-0 bottom-0 left-0 z-40 text-xs leading-4 text-slate-600"
          }
          role={validationError || error ? "alert" : "status"}
          aria-live={validationError || error ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {visibleMessage}
        </p>
      )}
      {isOpen && (
        <ul
          id={listId}
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              id={`${id}-option-${index}`}
              key={`${suggestion.displayName}-${suggestion.coordinates.join(",")}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              onMouseMove={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
            >
              {suggestion.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
