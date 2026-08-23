# Logiway Backend

Node 22, Express 5, ES module API for Gemini-assisted logistics routing with Nominatim risk-point geocoding, GraphHopper truck routing, and advisory OpenStreetMap facilities from Overpass.

## Requirements

- Node.js 22 or newer
- npm
- Gemini API key
- GraphHopper 11 runtime for live route calculations

## Setup

```sh
cp .env.example .env
npm ci
npm start
```

`GEMINI_API_KEY` is required at startup. `GEMINI_TIMEOUT_MS` defaults to `30000`, `GRAPHHOPPER_TIMEOUT_MS` to `120000`, and the shared provider `REQUEST_TIMEOUT_MS` to `15000`. `OVERPASS_URLS` accepts up to three comma-separated HTTPS providers and defaults to `https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter`; the single `OVERPASS_URL` remains supported. `OVERPASS_TIMEOUT_MS` defaults to `12000`. `CORS_ORIGIN` is optional; use a comma-separated list for multiple allowed origins. If omitted, CORS remains permissive for backward compatibility. Same-origin `/api` requests through Nginx do not depend on browser CORS; production cross-origin deployments must configure their actual HTTPS frontend origin.

## Scripts

```sh
npm run lint
npm run check
npm run check:start
```

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /api/locations?q=Jakarta`

The query is trimmed and must contain 3-200 characters. The endpoint returns at most five normalized Nominatim results as `{ "success": true, "locations": [{ "displayName": "...", "coordinates": [longitude, latitude] }] }`. Provider failures return a generic `502` response.

### `POST /api/calculate-smart-route`

Request:

```json
{
  "origin": "Jakarta",
  "dest": "Bandung",
  "originCoordinates": [106.8456, -6.2088],
  "destinationCoordinates": [107.6191, -6.9175],
  "truckProfile": "truck_medium",
  "truckSpecifications": {
    "maxHeightM": 3,
    "maxWidthM": 2.1,
    "maxLengthM": 6,
    "grossWeightTon": 8,
    "maxAxleLoadTon": 4
  }
}
```

Allowed truck profiles are `truck_small`, `truck_medium`, and `truck_large`. Origin and destination are trimmed and must each contain 2-200 characters. `originCoordinates` and `destinationCoordinates` are optional but must be supplied together. Coordinates from selected autocomplete suggestions are used directly, avoiding duplicate route geocoding and allowing routing to continue when Gemini quota and Nominatim are unavailable. When the pair is absent, normal Gemini-to-Nominatim geocoding fallback remains active. `truckSpecifications` is optional; when omitted, the selected profile's defaults are used. Its dimensions, gross weight, and axle load directly constrain which roads GraphHopper may use. Cargo capacity and CBM do not affect road constraints.

Coordinates are always `[longitude, latitude]`.

Success response contract:

```json
{
  "success": true,
  "distance_km": 123.4,
  "duration_minutes": 180,
  "route_mode": "standard",
  "is_navigable": true,
  "warning": null,
  "coordinates": [[106.8456, -6.2088], [107.6191, -6.9175]],
  "geocoding": {
    "origin": { "name": "Jakarta", "coordinates": [106.8456, -6.2088] },
    "destination": { "name": "Bandung", "coordinates": [107.6191, -6.9175] }
  },
  "pungli_points": [],
  "used_pungli_avoidance": false,
  "route_color": "#2563eb",
  "route_details": {
    "road_environment": [{ "from_index": 0, "to_index": 1, "value": "road" }],
    "road_class": [{ "from_index": 0, "to_index": 1, "value": "primary" }],
    "toll": [],
    "uses_ferry": false,
    "uses_toll": false
  },
  "route_facilities_status": "available",
  "route_facilities": []
}
```

Fallback levels are preserved:

1. Risk-aware GraphHopper route using truck constraints plus risk avoidance with CH disabled: `route_mode` is `risk_aware`.
2. Standard GraphHopper route using truck constraints with CH disabled: `route_mode` is `standard`.
3. Straight origin-to-destination `[lon,lat]` line: `distance_km` and `duration_minutes` are `null`, `route_mode` is `straight_line_fallback`, `is_navigable` is `false`, and `warning` explains that only a straight line is shown.

Real GraphHopper routes always return finite numeric distance and duration, `is_navigable: true`, and `warning: null`. `route_details` reports GraphHopper path details; ferry use comes from `road_environment`, while toll use accepts only `hgv` or `all`. For navigable routes, `route_facilities` contains up to 60 nearby OSM fuel, rest-area, and service-area POIs as advisory data. Public Overpass providers may be unavailable, so facilities remain advisory. `route_facilities_status` is `available` after a successful Overpass query (including an empty result), `unavailable` on provider failure, and `not_applicable` for straight-line fallback.

Gemini geocoding falls back to Nominatim when Gemini quota or provider errors occur. If AI quota is exhausted, risk analysis may be unavailable, but the standard GraphHopper route still works. Risk discovery or risk-point geocoding failure does not fail route calculation; routing continues without unavailable penalties. Active `pungli_points` are validated runtime risk points with valid coordinates, location, severity, and note. The local `indobert-pungli-classifier.zip` archive is quarantined and inactive because its package validation and provenance remain unresolved; no model metrics are asserted.

## Architecture

- `src/config`: environment and logging
- `src/domain`: coordinates, truck profiles, and pure routing-risk logic
- `src/repositories`: external-service contracts
- `src/infrastructure/repositories`: Gemini, Nominatim, GraphHopper, and Overpass adapters
- `src/services`: smart-route use case and fallback policy
- `src/controllers`, `src/routes`, `src/middleware`: HTTP boundary
- `src/container.js`: dependency-injection composition root
- `src/app.js`: Express app factory
- `src/server.js`: process entry point

## Docker

Build the API image:

```sh
docker build -t logiway-backend .
```

The production image installs lockfile-pinned production dependencies, runs as the non-root `node` user, and exposes a `/health` health check.

### GraphHopper artifacts

The `graphhopper/` directory preserves the old GraphHopper 11 configuration and truck profiles. Before building that image, place these untracked runtime artifacts directly in `graphhopper/`:

- `graphhopper-web-11.0.jar`
- `indonesia-260821.osm.pbf`

They are intentionally ignored because they are large upstream artifacts. The PBF filename must match `graphhopper/config-log.yml`. Generated `graphhopper/graph-cache/` is also ignored and should be mounted as a volume.

```sh
docker compose build
docker compose up
```

The API container uses `http://graphhopper:8989/route` with a `120000` ms timeout by default. The root frontend Nginx keeps a 10-second API proxy connect timeout and 150-second read/send timeouts. Do not bake `.env` or secrets into either image.
