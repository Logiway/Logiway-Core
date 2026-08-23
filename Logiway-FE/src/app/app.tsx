import {LoaderCircle, Route, Truck} from "lucide-react";
import {useState} from "react";
import {calculateSmartRoute, searchLocations} from "../api/index.ts";
import {
  ErrorToast,
  LocationField,
  RouteMap,
  Select,
  TruckSpecificationsCard,
} from "../components/index.ts";
import type {SelectOption} from "../components/index.ts";
import {DEFAULT_TRUCK, TRUCKS} from "../constants/index.ts";
import {useLocationAutocomplete, useSmartRoute} from "../hooks/index.ts";
import type {
  Coordinates,
  TruckProfile,
  TruckSpecificationDrafts,
  TruckSpecificationErrors,
  TruckSpecificationField,
  TruckSpecifications,
} from "../types/index.ts";

const truckOptions: readonly SelectOption<TruckProfile>[] = TRUCKS.map(
  (truck) => ({
    label: truck.name,
    value: truck.profile,
  }),
);

function createSpecificationDrafts(
  specifications: TruckSpecifications,
): TruckSpecificationDrafts {
  return {
    maxCapacityTon: String(specifications.maxCapacityTon),
    maxHeightM: String(specifications.maxHeightM),
    maxWidthM: String(specifications.maxWidthM),
    maxLengthM: String(specifications.maxLengthM),
    cbmVolume: String(specifications.cbmVolume),
  };
}

function validateLocation(value: string, label: "awal" | "tujuan") {
  const length = value.trim().length;
  if (length < 2) {
    return `Lokasi ${label} wajib diisi.`;
  }
  if (length > 200) {
    return `Lokasi ${label} maksimal 200 karakter.`;
  }
  return null;
}

function validateSpecifications(
  drafts: TruckSpecificationDrafts,
): TruckSpecificationErrors {
  const errors: TruckSpecificationErrors = {};
  const dimensionFields: readonly TruckSpecificationField[] = [
    "maxHeightM",
    "maxWidthM",
    "maxLengthM",
  ];

  for (const field of Object.keys(drafts) as TruckSpecificationField[]) {
    const value = Number(drafts[field]);
    if (drafts[field].trim() === "") {
      errors[field] = "Nilai wajib diisi.";
    } else if (!Number.isFinite(value) || value < 0.1) {
      errors[field] = "Nilai minimal 0,1.";
    } else if (dimensionFields.includes(field) && value > 12.6) {
      errors[field] = "Dimensi maksimal 12,6 meter.";
    }
  }

  return errors;
}

export function App() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoordinates, setOriginCoordinates] =
    useState<Coordinates | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] =
    useState<Coordinates | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [truckProfile, setTruckProfile] = useState<TruckProfile>(
    DEFAULT_TRUCK.profile,
  );
  const [specifications, setSpecifications] = useState<TruckSpecifications>(
    () => ({
      ...DEFAULT_TRUCK.specifications,
    }),
  );
  const [specificationDrafts, setSpecificationDrafts] =
    useState<TruckSpecificationDrafts>(() =>
      createSpecificationDrafts(DEFAULT_TRUCK.specifications),
    );
  const originAutocomplete = useLocationAutocomplete(origin, searchLocations);
  const destinationAutocomplete = useLocationAutocomplete(
    destination,
    searchLocations,
  );
  const smartRoute = useSmartRoute(calculateSmartRoute);
  const specificationErrors = validateSpecifications(specificationDrafts);
  const hasSpecificationErrors = Object.keys(specificationErrors).length > 0;
  const originValidationError = submitted
    ? validateLocation(origin, "awal")
    : null;
  const destinationValidationError = submitted
    ? validateLocation(destination, "tujuan")
    : null;

  function handleCalculate() {
    setSubmitted(true);
    const originError = validateLocation(origin, "awal");
    const destinationError = validateLocation(destination, "tujuan");
    if (originError || destinationError || hasSpecificationErrors) {
      return;
    }
    void smartRoute.calculate(
      origin.trim(),
      destination.trim(),
      originCoordinates,
      destinationCoordinates,
      truckProfile,
      specifications,
    );
  }

  function handleTruckProfileChange(profile: TruckProfile) {
    const truck =
      TRUCKS.find((option) => option.profile === profile) ?? DEFAULT_TRUCK;
    const nextSpecifications = {...truck.specifications};
    smartRoute.reset();
    setTruckProfile(profile);
    setSpecifications(nextSpecifications);
    setSpecificationDrafts(createSpecificationDrafts(nextSpecifications));
  }

  function handleSpecificationChange(
    field: TruckSpecificationField,
    draft: string,
    value: number | null,
  ) {
    smartRoute.reset();
    setSpecificationDrafts((current) => ({...current, [field]: draft}));
    if (value !== null && value >= 0.1) {
      setSpecifications((current) => ({...current, [field]: value}));
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-auto bg-slate-100 lg:flex-row lg:overflow-hidden">
      <aside
        className="relative z-10 flex max-h-[58dvh] w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-slate-200 bg-slate-50 px-5 py-6 shadow-xl shadow-slate-900/10 sm:px-7 lg:h-full lg:max-h-none lg:w-112 lg:border-r lg:border-b-0 lg:px-8 lg:py-8"
        aria-labelledby="page-title"
      >
        <header className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <img
            src="/logiway-logo.png"
            alt=""
            aria-hidden="true"
            className="size-14 rounded-2xl object-cover shadow-md shadow-blue-900/15"
          />
          <div>
            <h1
              id="page-title"
              className="text-xl font-extrabold tracking-tight text-slate-950"
            >
              Smart Logistics Router
            </h1>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Rute otomatis dan penilaian risiko berbasis AI
            </p>
          </div>
        </header>

        <div className="grid gap-4">
          <LocationField
            id="origin"
            label="Lokasi Awal"
            placeholder="Ketik tempat asal"
            value={origin}
            suggestions={originAutocomplete.suggestions}
            isOpen={originAutocomplete.isOpen}
            isSearching={originAutocomplete.isSearching}
            error={originAutocomplete.error}
            validationError={originValidationError}
            hasSearched={originAutocomplete.hasSearched}
            onChange={(value) => {
              smartRoute.reset();
              originAutocomplete.reset(value);
              setOrigin(value);
              setOriginCoordinates(null);
            }}
            onOpenChange={originAutocomplete.setIsOpen}
            onSelect={(suggestion) => {
              smartRoute.reset();
              originAutocomplete.reset(suggestion.displayName, true);
              setOrigin(suggestion.displayName);
              setOriginCoordinates(suggestion.coordinates);
            }}
          />

          <LocationField
            id="destination"
            label="Lokasi Tujuan"
            placeholder="Ketik tempat tujuan"
            value={destination}
            suggestions={destinationAutocomplete.suggestions}
            isOpen={destinationAutocomplete.isOpen}
            isSearching={destinationAutocomplete.isSearching}
            error={destinationAutocomplete.error}
            validationError={destinationValidationError}
            hasSearched={destinationAutocomplete.hasSearched}
            onChange={(value) => {
              smartRoute.reset();
              destinationAutocomplete.reset(value);
              setDestination(value);
              setDestinationCoordinates(null);
            }}
            onOpenChange={destinationAutocomplete.setIsOpen}
            onSelect={(suggestion) => {
              smartRoute.reset();
              destinationAutocomplete.reset(suggestion.displayName, true);
              setDestination(suggestion.displayName);
              setDestinationCoordinates(suggestion.coordinates);
            }}
          />

          <div className="flex flex-col gap-2">
            <label
              id="truck-profile-label"
              className="text-sm font-semibold text-slate-700"
              htmlFor="truck-profile"
            >
              Jenis Truk
            </label>
            <Select
              id="truck-profile"
              value={truckProfile}
              options={truckOptions}
              onChange={handleTruckProfileChange}
              ariaLabelledBy="truck-profile-label"
              icon={<Truck aria-hidden="true" className="size-4" />}
            />
          </div>
        </div>

        <TruckSpecificationsCard
          specifications={specifications}
          drafts={specificationDrafts}
          errors={specificationErrors}
          onChange={handleSpecificationChange}
        />

        <div className="relative pb-5">
          <button
            type="button"
            className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none motion-reduce:transition-none"
            onClick={handleCalculate}
            disabled={smartRoute.isLoading}
            aria-describedby={
              hasSpecificationErrors ? "route-specification-error" : undefined
            }
          >
            {smartRoute.isLoading ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Route aria-hidden="true" className="size-5" />
            )}
            Hitung Rute Otomatis
          </button>
          {hasSpecificationErrors && (
            <p
              id="route-specification-error"
              className="absolute right-0 bottom-0 left-0 text-sm leading-5 text-red-600"
              role="status"
            >
              Perbaiki spesifikasi truk sebelum menghitung rute.
            </p>
          )}
        </div>
      </aside>

      <RouteMap status={smartRoute.status} />
      {smartRoute.status.type === "error" && (
        <ErrorToast
          message={smartRoute.status.message}
          onClose={smartRoute.dismissError}
        />
      )}
    </main>
  );
}
