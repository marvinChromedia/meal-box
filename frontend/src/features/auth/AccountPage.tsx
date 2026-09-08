import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button.tsx';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.tsx';
import { useCurrentUser, useSignOut } from './hooks.ts';

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  function handleSignOut() {
    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login', { state: { justSignedOut: true } });
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card>
        <CardHeader>
          <h1>Your account</h1>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <p className="text-ink-muted">
            Signed in as <span className="font-medium text-ink">{user?.email}</span>
          </p>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
            className="w-full sm:w-auto"
          >
            {signOutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
