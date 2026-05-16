import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { createListing } from "@/lib/firestore";
import { api } from "@/lib/api";
import { ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function CreateListingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("good");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const onFilesPicked = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, 5);
    const base64 = await Promise.all(
      picked.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          })
      )
    );
    setImages((prev) => [...prev, ...base64].slice(0, 5));
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (images.length >= 5) return;
      void onFilesPicked(e.dataTransfer.files);
    },
    [images.length]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onEnhance = async () => {
    if (!title.trim()) {
      toast.error("Add a title first");
      return;
    }
    try {
      setLoading(true);
      const response = await api<{ enhanced_description: string }>("/api/listings/enhance", {
        method: "POST",
        payload: { title: title.trim(), description: description.trim() },
      });
      setDescription(response.enhanced_description);
      toast.success("Description enhanced");
    } catch (error) {
      handleAppError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      return toast.error("Please add a title");
    }
    if (!description.trim()) {
      return toast.error("Please add a description");
    }
    if (!price || isNaN(Number(price))) {
      return toast.error("Please add a valid price");
    }
    if (images.length === 0) {
      return toast.error("Please upload at least one photo");
    }

    try {
      setLoading(true);
      await createListing({
        title,
        description,
        price: Number(price),
        category,
        condition,
        images,
      });
      toast.success("Listing created");
      navigate("/marketplace");
    } catch (error) {
      handleAppError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6 pb-28">
      <h2 className="text-2xl font-semibold">Create listing</h2>

      <Field label="Title" htmlFor="listing-title">
        <Input id="listing-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      </Field>

      <Field label="Description" htmlFor="listing-description" helpText="Tip: use AI enhance for a polished draft.">
        <Textarea
          id="listing-description"
          autoGrow
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe condition, pickup, and what's included"
        />
      </Field>

      <Button variant="outline" onClick={onEnhance} disabled={loading}>
        AI enhance
      </Button>

      <Field label="Price" htmlFor="listing-price">
        <Input
          id="listing-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select
            value={category}
            onValueChange={setCategory}
            options={[
              { value: "electronics", label: "Electronics" },
              { value: "furniture", label: "Furniture" },
              { value: "other", label: "Other" },
            ]}
          />
        </Field>
        <Field label="Condition">
          <Select
            value={condition}
            onValueChange={setCondition}
            options={[
              { value: "new", label: "New" },
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
            ]}
          />
        </Field>
      </div>

      <Field label="Photos" helpText="Up to 5 images. Drag and drop or click to upload.">
        <div className="space-y-4">
          {images.length < 5 && (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
                dragActive ? "border-brand bg-brand-soft/40" : "border-border bg-surface hover:bg-surface-2/50"
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <ImagePlus className="mb-2 h-8 w-8 text-ink-soft" />
              <span className="text-sm font-medium">Drop photos here or click to browse</span>
              <span className="mt-1 text-xs text-ink-soft">JPG, PNG — max 5</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
            </label>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {images.map((image, i) => (
                <div key={`${image}-${i}`} className="group relative aspect-square w-full">
                  <img
                    src={image}
                    alt={`Listing preview ${i + 1}`}
                    className="h-full w-full rounded-lg object-cover shadow-sm ring-1 ring-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-bg/80 text-ink opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-danger hover:text-white group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>

      <div className="hidden lg:block">
        <Button onClick={onSubmit} disabled={loading}>
          Publish listing
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto w-full max-w-2xl px-4">
          <Button className="w-full" onClick={onSubmit} disabled={loading}>
            Publish listing
          </Button>
        </div>
      </div>
    </div>
  );
}
