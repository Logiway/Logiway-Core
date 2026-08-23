import {
  Box,
  MoveHorizontal,
  MoveVertical,
  Ruler,
  Weight,
} from "lucide-react";
import type {
  TruckSpecificationDrafts,
  TruckSpecificationErrors,
  TruckSpecificationField,
  TruckSpecifications,
} from "../../types/index.ts";

interface TruckSpecificationsCardProps {
  specifications: TruckSpecifications;
  drafts: TruckSpecificationDrafts;
  onChange: (
    field: TruckSpecificationField,
    draft: string,
    value: number | null,
  ) => void;
  errors: TruckSpecificationErrors;
}

interface SpecificationField {
  key: TruckSpecificationField;
  label: string;
  unit: string;
  max?: number;
  icon: typeof Weight;
}

const fields: readonly SpecificationField[] = [
  {
    key: "maxCapacityTon",
    label: "Kapasitas Maks",
    unit: "ton",
    icon: Weight,
  },
  {
    key: "maxHeightM",
    label: "Tinggi Maks",
    unit: "m",
    max: 12.6,
    icon: MoveVertical,
  },
  {
    key: "maxWidthM",
    label: "Lebar Maks",
    unit: "m",
    max: 12.6,
    icon: MoveHorizontal,
  },
  {
    key: "maxLengthM",
    label: "Panjang Maks",
    unit: "m",
    max: 12.6,
    icon: Ruler,
  },
  {
    key: "cbmVolume",
    label: "Volume",
    unit: "CBM",
    icon: Box,
  },
];

const inputClassName =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pr-12 pl-9 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 aria-invalid:border-red-400 aria-invalid:ring-red-500/15";

export function TruckSpecificationsCard({
  specifications,
  drafts,
  onChange,
  errors,
}: TruckSpecificationsCardProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby="truck-specifications-title"
    >
      <h2
        id="truck-specifications-title"
        className="text-sm font-bold text-slate-900"
      >
        Batasan Dimensi &amp; Muatan
      </h2>
      <p
        id="truck-specifications-help"
        className="mt-1 text-xs leading-5 text-slate-500"
      >
        Hanya tinggi, lebar, dan panjang kendaraan yang memengaruhi pemilihan jalan.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {fields.map((field) => {
          const Icon = field.icon;
          const inputId = `truck-specification-${field.key}`;
          const errorId = `${inputId}-error`;
          const error = errors[field.key];

          return (
            <div
              key={field.key}
              className={`relative pb-8 ${
                field.key === "cbmVolume" ? "col-span-2" : ""
              }`}
            >
              <label
                htmlFor={inputId}
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                {field.label}
              </label>
              <div className="relative">
                <Icon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cyan-600"
                />
                <input
                  id={inputId}
                  className={inputClassName}
                  type="number"
                  min="0.1"
                  max={field.max}
                  step="0.1"
                  inputMode="decimal"
                  value={
                    drafts[field.key] === ""
                      ? ""
                      : drafts[field.key] || specifications[field.key]
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? errorId : "truck-specifications-help"
                  }
                  onChange={(event) => {
                    const draft = event.currentTarget.value;
                    const nextValue = event.currentTarget.valueAsNumber;
                    onChange(
                      field.key,
                      draft,
                      Number.isFinite(nextValue) ? nextValue : null,
                    );
                  }}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-500">
                  {field.unit}
                </span>
              </div>
              {error && (
                <p
                  id={errorId}
                  className="absolute right-0 bottom-0 left-0 text-xs leading-4 text-red-600"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
