import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { createAnnouncement } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="page-container max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">Create announcement</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's happening on campus?" />
      <Button disabled={loading} onClick={handleSubmit}>
        Publish
      </Button>
    </div>
  );
}
