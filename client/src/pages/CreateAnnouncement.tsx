import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { createAnnouncement } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

export function CreateAnnouncementPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and announcement text");
      return;
    }
    try {
      setLoading(true);
      await createAnnouncement({ title: title.trim(), body: body.trim() });
      toast.success("Announcement posted");
      navigate("/feed");
    } catch (error) {
      handleAppError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6 pb-24">
      <h2 className="text-2xl font-semibold">Create announcement</h2>

      <Field label="Title" htmlFor="announcement-title">
        <Input id="announcement-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      </Field>

      <Field label="Announcement" htmlFor="announcement-body">
        <Textarea
          id="announcement-body"
          autoGrow
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's happening on campus?"
        />
      </Field>

      <div className="hidden lg:block">
        <Button disabled={loading} onClick={handleSubmit}>
          Publish
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto w-full max-w-2xl px-4">
          <Button className="w-full" disabled={loading} onClick={handleSubmit}>
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
