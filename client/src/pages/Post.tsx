import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export function PostPage() {
  return (
    <div className="page-container grid gap-4 sm:grid-cols-2">
      <Link to="/create-listing">
        <Card className="h-full">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Create listing</h2>
            <p className="text-ink-soft">Sell items in campus marketplace.</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/create-announcement">
        <Card className="h-full">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold">Create announcement</h2>
            <p className="text-ink-soft">Share updates with your campus community.</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
