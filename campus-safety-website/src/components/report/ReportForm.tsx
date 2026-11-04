"use client";

import { useState, useCallback } from "react";
import {
  Camera,
  MapPin,
  Tag,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels, type HazardCategory, type Severity } from "@/types";
import CategoryIcon from "@/components/shared/CategoryIcon";
import LocationPicker from "@/components/map/LocationPicker";

const steps = [
  { label: "Photos", icon: Camera },
  { label: "Location", icon: MapPin },
  { label: "Details", icon: Tag },
  { label: "Review", icon: CheckCircle },
];

const categories: HazardCategory[] = [
  "pothole", "damaged_pavement", "faded_markings",
  "roadside_obstruction", "drainage_issue", "poor_lighting", "other",
];

const severityOptions: { value: Severity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

export default function ReportForm() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState<HazardCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotos((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const canNext = () => {
    if (step === 0) return photos.length > 0;
    if (step === 1) return location !== null;
    if (step === 2) return category !== null && severity !== null;
    return true;
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Report Submitted!</h2>
        <p className="text-muted mb-4">Your report ID is <span className="font-mono font-bold text-primary">RPT-2048</span></p>
        <p className="text-sm text-muted mb-6">
          You can track the status of your report using this ID on the Track Report page.
        </p>
        <a
          href="/track"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Track Your Report
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                    i < step
                      ? "bg-primary text-white"
                      : i === step
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={cn("text-xs mt-1.5 font-medium", i <= step ? "text-primary" : "text-muted")}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-4 sm:w-10 md:w-16 h-0.5 mx-1 sm:mx-2 mb-4 sm:mb-5", i < step ? "bg-primary" : "bg-gray-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[350px]">
        {/* Step 0: Photos */}
        {step === 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Upload Photos</h3>
            <p className="text-sm text-muted mb-6">Take or upload photos of the hazard</p>

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragActive ? "border-primary bg-accent" : "border-gray-300 hover:border-primary hover:bg-accent/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-medium text-foreground">Drag & drop photos here</p>
              <p className="text-sm text-muted mt-1">or click to browse</p>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
                {photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={photo} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Set Location</h3>
            <p className="text-sm text-muted mb-6">Click on the map or use GPS to mark the hazard location</p>
            <LocationPicker value={location} onChange={setLocation} />
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Hazard Details</h3>
            <p className="text-sm text-muted mb-6">Select the category and severity</p>

            <label className="block text-sm font-medium mb-3">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm",
                    category === cat
                      ? "border-primary bg-accent text-primary font-semibold"
                      : "border-gray-200 hover:border-primary/40 text-muted"
                  )}
                >
                  <CategoryIcon category={cat} className="w-6 h-6" />
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium mb-3">Severity</label>
            <div className="flex gap-3 mb-8">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                    severity === opt.value
                      ? "border-primary bg-accent text-primary"
                      : "border-gray-200 hover:border-primary/40 text-muted"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full mx-auto mb-1.5", opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the hazard in detail..."
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-1">Review Your Report</h3>
            <p className="text-sm text-muted mb-6">Please confirm the details before submitting</p>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                {photos[0] && (
                  <img src={photos[0]} alt="Hazard" className="w-24 h-24 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm text-muted">Photos</p>
                  <p className="font-medium">{photos.length} photo(s) uploaded</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Location</p>
                  <p className="font-medium">
                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Category</p>
                  <p className="font-medium">{category ? categoryLabels[category] : "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Severity</p>
                  <p className="font-medium capitalize">{severity ?? "Not set"}</p>
                </div>
              </div>

              {description && (
                <div>
                  <p className="text-sm text-muted">Description</p>
                  <p className="font-medium">{description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                By submitting this report, you confirm that the information provided is accurate to the best of your knowledge.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
            step === 0 ? "text-gray-300 cursor-not-allowed" : "text-muted hover:text-foreground hover:bg-gray-100"
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors",
              canNext()
                ? "bg-primary text-white hover:bg-primary-dark"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Submit Report
          </button>
        )}
      </div>
    </div>
  );
}
