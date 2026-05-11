import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { DORMS, UNIVERSITIES } from "@/lib/constants";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UniversitySelectPage() {
  const [universityId, setUniversityId] = useState(UNIVERSITIES[0].id);
  const [dormName, setDormName] = useState("");
  const navigate = useNavigate();

  const dormOptions = useMemo(
    () =>
      (DORMS[universityId] || []).map((dorm) => ({
        value: dorm,
        label: dorm,
      })),
    [universityId]
  );

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const university = UNIVERSITIES.find((item) => item.id === universityId);
    if (!university) return;

    await setDoc(
      doc(db, "users", user.uid),
      {
        universityId,
        universityName: university.name,
        dormName,
        email: user.email || "",
        fullName: user.displayName || "Student",
        avatarUrl: user.photoURL || "",
      },
      { merge: true }
    );
    toast.success("Profile updated");
    navigate("/feed");
  };

  return (
    <div className="page-container flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-semibold">Choose your campus</h1>
          <Select
            value={universityId}
            onValueChange={setUniversityId}
            options={UNIVERSITIES.map((item) => ({ value: item.id, label: item.name }))}
          />
          <Select
            value={dormName}
            onValueChange={setDormName}
            options={[{ value: "", label: "Select dorm" }, ...dormOptions]}
          />
          <Button className="w-full" onClick={handleSave}>
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
