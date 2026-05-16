import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { updateProfile } from "@/lib/firestore";
import { handleAppError } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Field } from "@/components/ui/field";

export function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [dormName, setDormName] = useState(profile?.dormName || "");
  const [avatarData, setAvatarData] = useState<string>("");

  const onFileChange = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Cannot read file"));
      reader.readAsDataURL(file);
    });
    setAvatarData(dataUrl);
  };

  const onSave = async () => {
    try {
      let avatarUrl = profile?.avatarUrl || "";
      if (avatarData && user) {
        const res = await api<{ url: string }>("/api/upload", {
          method: "POST",
          payload: { image: avatarData },
        });
        avatarUrl = res.url;
      }
      await updateProfile({ fullName, dormName, avatarUrl });
      toast.success("Profile updated");
      navigate("/profile");
    } catch (error) {
      handleAppError(error, toast);
    }
  };

  return (
    <div className="page-container max-w-xl space-y-6 pb-24">
      <h2 className="text-2xl font-semibold">Edit profile</h2>

      <Field label="Full name" htmlFor="edit-full-name">
        <Input id="edit-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
      </Field>

      <Field label="Dorm" htmlFor="edit-dorm" helpText="Shown on your public profile.">
        <Input id="edit-dorm" value={dormName} onChange={(e) => setDormName(e.target.value)} placeholder="Dorm name" />
      </Field>

      <Field label="Profile photo" helpText="Click the camera to upload a new avatar.">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative h-24 w-24">
            <UserAvatar
              src={avatarData || profile?.avatarUrl}
              name={fullName || profile?.fullName}
              className="h-24 w-24 text-2xl"
            />
            <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-brand text-brand-fg shadow-sm transition-transform hover:scale-105">
              <Camera className="h-4 w-4" aria-hidden />
              <span className="sr-only">Upload avatar</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e.target.files)} />
            </label>
          </div>
        </div>
      </Field>

      <div className="hidden lg:block">
        <Button onClick={onSave}>Save changes</Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto w-full max-w-xl px-4">
          <Button className="w-full" onClick={onSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
