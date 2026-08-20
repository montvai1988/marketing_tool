import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

/** Public page linked from the footer of every sent message. */
export default function Unsubscribe() {
  const params = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [done, setDone] = useState(false);

  const unsubscribe = trpc.public.unsubscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  return (
    <div className="paper-grain flex min-h-screen items-center justify-center px-4 py-16">
      <div className="panel w-full max-w-md p-8">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-7 w-7 text-primary" />
            <h1 className="mb-3 text-2xl">Leiratkozás rögzítve</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A megadott címre a továbbiakban nem küldünk megkeresést. Köszönjük a visszajelzést.
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">Leiratkozás</p>
            <h1 className="mb-3 text-2xl">Nem szeretne több levelet?</h1>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Add meg az e-mail címét, és azonnal felvesszük a kizárási listánkra.
            </p>
            <div className="space-y-2">
              <Label htmlFor="unsub-email">E-mail cím</Label>
              <Input
                id="unsub-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="cim@pelda.hu"
              />
            </div>
            {unsubscribe.isError ? (
              <p className="mt-3 text-sm text-destructive">
                A leiratkozás most nem sikerült. Kérlek, próbáld újra.
              </p>
            ) : null}
            <Button
              className="mt-6 w-full"
              onClick={() => unsubscribe.mutate({ email: email.trim() })}
              disabled={unsubscribe.isPending || email.trim().length === 0}
            >
              {unsubscribe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Leiratkozom
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

