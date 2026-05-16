import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginWithEmail, loginWithGoogle } from "@/lib/auth";
import { handleAppError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithEmail(email, password);
      navigate("/feed");
    } catch (error) {
      handleAppError(error, toast);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const { exists } = await loginWithGoogle();
      if (exists) {
        navigate("/feed");
      } else {
        navigate("/auth/university-select");
      }
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
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <Field label="Email" htmlFor="auth-login-email">
            <Input
              id="auth-login-email"
              placeholder="you@university.edu"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Password" htmlFor="auth-login-password">
            <Input
              id="auth-login-password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button disabled={loading} onClick={handleLogin} className="w-full">
            Login
          </Button>
          <Button disabled={loading} variant="outline" onClick={handleGoogle} className="w-full">
            Continue with Google
          </Button>
          <p className="text-sm text-ink-soft">
            New here? <Link to="/auth/register">Create account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
