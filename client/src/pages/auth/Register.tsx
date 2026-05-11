import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerWithEmail } from "@/lib/auth";
import { handleAppError } from "@/lib/utils";
import { DORMS, UNIVERSITIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [universityId, setUniversityId] = useState(UNIVERSITIES[0].id);
  const [dormName, setDormName] = useState("");
  const [loading, setLoading] = useState(false);

  const dormOptions = useMemo(
    () =>
      (DORMS[universityId] || []).map((dorm) => ({
        value: dorm,
        label: dorm,
      })),
    [universityId]
  );

  const university = UNIVERSITIES.find((item) => item.id === universityId);

  const handleSubmit = async () => {
    if (!university) return;
    if (!email.endsWith(`@${university.domain}`)) {
      toast.error(`Use your ${university.domain} email`);
      return;
    }
    if (!dormName) {
      toast.error("Choose a dorm");
      return;
    }
    try {
      setLoading(true);
      await registerWithEmail({
        email,
        password,
        fullName,
        universityId,
        universityName: university.name,
        dormName,
      });
      navigate("/feed");
    } catch (error) {
      handleAppError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="University email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
          <Button disabled={loading} className="w-full" onClick={handleSubmit}>
            Create account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
