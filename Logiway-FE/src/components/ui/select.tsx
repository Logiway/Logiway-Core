import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

export interface SelectOption<Value extends string> {
  label: string;
  value: Value;
}

interface SelectProps<Value extends string> {
  id: string;
  value: Value;
  options: readonly SelectOption<Value>[];
  onChange: (value: Value) => void;
  icon?: ReactNode;
  ariaLabelledBy?: string;
}

interface ListPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
}

const listGap = 4;
const estimatedListHeight = 148;

export function Select<Value extends string>({
  id,
  value,
  options,
  onChange,
  icon,
  ariaLabelledBy,
}: SelectProps<Value>) {
  const generatedId = useId();
  const selectId = generatedId.replaceAll(":", "");
  const listId = `${id}-${selectId}-listbox`;
  const valueId = `${id}-${selectId}-value`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const activeOption = options[activeIndex];
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function positionList() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUpward =
        spaceBelow < estimatedListHeight + listGap &&
        rect.top > estimatedListHeight + listGap;
      setListPosition({
        left: rect.left,
        width: rect.width,
        ...(opensUpward
          ? { bottom: window.innerHeight - rect.top + listGap }
          : { top: rect.bottom + listGap }),
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    positionList();
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", positionList);
    window.addEventListener("scroll", positionList, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", positionList);
      window.removeEventListener("scroll", positionList, true);
    };
  }, [isOpen]);

  function open(activeOptionIndex = selectedIndex) {
    setActiveIndex(activeOptionIndex);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option) {
      return;
    }

    onChange(option.value);
    setActiveIndex(index);
    close();
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (options.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        open(selectedIndex);
      } else {
        setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open(selectedIndex);
      } else {
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      if (!isOpen) {
        open(0);
      } else {
        setActiveIndex(0);
      }
    } else if (event.key === "End") {
      event.preventDefault();
      if (!isOpen) {
        open(options.length - 1);
      } else {
        setActiveIndex(options.length - 1);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        selectOption(activeIndex);
      } else {
        open(selectedIndex);
      }
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      close();
    }
  }

  const listStyle: CSSProperties | undefined = listPosition
    ? {
        left: listPosition.left,
        top: listPosition.top,
        bottom: listPosition.bottom,
        width: listPosition.width,
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className="relative flex min-h-12 w-full items-center rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-10 text-left text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20"
        aria-labelledby={
          ariaLabelledBy ? `${ariaLabelledBy} ${valueId}` : undefined
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={
          isOpen && activeOption ? `${listId}-option-${activeIndex}` : undefined
        }
        onClick={() => (isOpen ? close() : open(selectedIndex))}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (
            !nextTarget ||
            (!event.currentTarget.contains(nextTarget) &&
              !listRef.current?.contains(nextTarget))
          ) {
            close();
          }
        }}
      >
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-cyan-600">
            {icon}
          </span>
        )}
        <span id={valueId} className="truncate">
          {selectedOption?.label ?? "Pilih opsi"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-500 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={listStyle}
            className="fixed z-100 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <li
                  id={`${listId}-option-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors motion-reduce:transition-none ${
                    isActive || isSelected
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onMouseMove={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(index)}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-blue-600" />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
