import { CheckCircle, Circle, Package, Truck, Home, Clock } from "lucide-react";

// ─── Step Definitions ────────────────────────────────────────────────────────
// Keys match the normalised frontend status values used throughout the app.
// The backend `GET /api/orders/:orderId/timeline` returns timestamped events;
// those are matched against these steps to show real dates per step.
const STEPS = [
  {
    key:         "to_pay",
    label:       "Order Placed",
    description: "Your order has been received",
    icon:        Package,
    // Backend timeline event types that correspond to this step
    eventTypes:  ["order_placed", "pending"],
  },
  {
    key:         "to_ship",
    label:       "Processing",
    description: "We're preparing your items",
    icon:        Package,
    eventTypes:  ["processing", "confirmed"],
  },
  {
    key:         "to_receive",
    label:       "Shipped",
    description: "Your package is on the way",
    icon:        Truck,
    eventTypes:  ["shipped", "dispatched"],
  },
  {
    key:         "completed",
    label:       "Delivered",
    description: "Package has been delivered",
    icon:        Home,
    eventTypes:  ["delivered", "completed"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the timestamp for a step from the backend timeline events array.
 *
 * Backend timeline event shape (from GET /api/orders/:id/timeline):
 *   { status: "processing", created_at: "2026-01-15T10:30:00Z", description: "..." }
 *
 * We check both `event.status` and `event.event_type` against the step's eventTypes list.
 */
function getStepTimestamp(step, timelineEvents = []) {
  const match = timelineEvents.find(
    (e) =>
      step.eventTypes.includes(e.status) ||
      step.eventTypes.includes(e.event_type)
  );
  return match?.created_at ?? match?.timestamp ?? null;
}

function formatDateTime(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  }) + " · " + date.toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Props:
//   status         — current order status (frontend tab key, e.g. "to_ship")
//   timelineEvents — array of backend timeline events (optional, enriches with real timestamps)
//
export default function TrackingTimeline({ status, timelineEvents = [] }) {
  const currentIndex = STEPS.findIndex((step) => step.key === status);
  // Guard against unknown statuses — show nothing completed
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div>

      {/* ── Desktop: Horizontal Timeline (md and up) ─────────────────────── */}
      <div className="hidden md:block relative">

        {/* Background track */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200" style={{ zIndex: 0 }}>
          <div
            className="h-full bg-black transition-all duration-500 ease-in-out"
            style={{ width: `${(safeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between" style={{ zIndex: 1 }}>
          {STEPS.map((step, index) => {
            const isCompleted = index < safeIndex;
            const isCurrent   = index === safeIndex;
            const isActive    = index <= safeIndex;
            const timestamp   = getStepTimestamp(step, timelineEvents);

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">

                {/* Icon Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                    isActive
                      ? "bg-black text-white shadow-lg scale-110"
                      : "bg-white border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>

                {/* Labels */}
                <div className="text-center max-w-[130px]">
                  <p className={`text-sm font-bold mb-1 ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  <p className={`text-xs ${isActive ? "text-gray-500" : "text-gray-400"}`}>
                    {step.description}
                  </p>

                  {/* Timestamp from backend timeline */}
                  {timestamp && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(timestamp)}
                    </p>
                  )}

                  {/* Current Step Badge */}
                  {isCurrent && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-black text-white text-xs font-bold rounded-full animate-pulse">
                        Current
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: Vertical Timeline (below md) ─────────────────────────── */}
      <div className="md:hidden space-y-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < safeIndex;
          const isCurrent   = index === safeIndex;
          const isActive    = index <= safeIndex;
          const isLast      = index === STEPS.length - 1;
          const Icon        = step.icon;
          const timestamp   = getStepTimestamp(step, timelineEvents);

          return (
            <div key={step.key} className="flex items-start gap-4">

              {/* Icon + Connector Line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isActive ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                {/* Vertical connector — skip on last step */}
                {!isLast && (
                  <div className={`w-0.5 h-16 mt-1 ${isActive && !isCurrent ? "bg-black" : "bg-gray-200"}`} />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pt-2 pb-6">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className={`font-bold text-sm ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-black text-white text-xs font-bold rounded-full animate-pulse">
                      Current
                    </span>
                  )}
                </div>

                <p className={`text-sm ${isActive ? "text-gray-600" : "text-gray-400"}`}>
                  {step.description}
                </p>

                {/* Timestamp */}
                {timestamp && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(timestamp)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}