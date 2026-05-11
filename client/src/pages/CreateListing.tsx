import { useState } from "react";
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

export function CreateListingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("good");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const onFilesPicked = async (files: FileList | null) => {
    if (!files) return;
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
    // Append new images instead of replacing them completely
    setImages((prev) => [...prev, ...base64].slice(0, 5));
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

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
    <div className="page-container max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Create listing</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
      <Button variant="outline" onClick={onEnhance} disabled={loading}>
        AI enhance
      </Button>
      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          value={category}
          onValueChange={setCategory}
          options={[
            { value: "electronics", label: "Electronics" },
            { value: "furniture", label: "Furniture" },
            { value: "other", label: "Other" },
          ]}
        />
        <Select
          value={condition}
          onValueChange={setCondition}
          options={[
            { value: "new", label: "New" },
            { value: "good", label: "Good" },
            { value: "fair", label: "Fair" },
          ]}
        />
      </div>
      <div className="space-y-4">
        {images.length < 5 && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card hover:bg-muted/50 p-6 transition-colors">
            <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to upload photos</span>
            <span className="text-xs text-muted-foreground mt-1">Up to 5 images (JPG, PNG)</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {images.map((image, i) => (
              <div key={image} className="group relative aspect-square w-full">
                <img 
                  src={image} 
                  alt="Preview" 
                  className="h-full w-full rounded-lg object-cover shadow-sm ring-1 ring-border" 
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Button onClick={onSubmit} disabled={loading}>
        Publish listing
      </Button>
    </div>
  );
}
