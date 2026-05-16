import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerWithEmail } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { handleAppError } from "@/lib/utils";
import { DORM_SELECT_PLACEHOLDER, DORMS, UNIVERSITIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

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

  useEffect(() => {
    setDormName("");
  }, [universityId]);

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
      if (auth.currentUser) {
        useAuthStore.getState().setUser(auth.currentUser);
      }
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
          <Field label="Full name" htmlFor="auth-register-name">
            <Input id="auth-register-name" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="University email" htmlFor="auth-register-email" helpText={university ? `Must end with @${university.domain}` : undefined}>
            <Input id="auth-register-email" placeholder="University email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="auth-register-password">
            <Input
              id="auth-register-password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="University">
            <Select
              value={universityId}
              onValueChange={setUniversityId}
              options={UNIVERSITIES.map((item) => ({ value: item.id, label: item.name }))}
            />
          </Field>
          <Field label="Dorm">
            <Select
              value={dormName || DORM_SELECT_PLACEHOLDER}
              onValueChange={(v) => setDormName(v === DORM_SELECT_PLACEHOLDER ? "" : v)}
              options={[{ value: DORM_SELECT_PLACEHOLDER, label: "Select dorm" }, ...dormOptions]}
              placeholder="Select dorm"
            />
          </Field>
          <Button disabled={loading} className="w-full" onClick={handleSubmit}>
            Create account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
