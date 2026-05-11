import { Link } from "react-router-dom";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function OnboardingPage() {
  return (
    <div className="page-container flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 p-8">
          <AppLogo />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Your campus, one app</h1>
            <p className="text-muted-foreground">
              Marketplace, campus feed, chats, and AI-enhanced listings in a cozy lofi web
              experience.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/auth/register">
              <Button className="w-full">Create account</Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="outline" className="w-full">
                Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
