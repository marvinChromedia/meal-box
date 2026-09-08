import { useState } from 'react';
import type { ReactNode } from 'react';

import { Alert } from '../components/ui/Alert.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import type { ButtonSize, ButtonVariant } from '../components/ui/Button.tsx';
import { Card, CardBody, CardFooter, CardHeader } from '../components/ui/Card.tsx';
import { Checkbox } from '../components/ui/Checkbox.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { Input } from '../components/ui/Input.tsx';
import { LoadingState } from '../components/ui/LoadingState.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Radio } from '../components/ui/Radio.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Textarea } from '../components/ui/Textarea.tsx';

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'outline', 'danger', 'ghost'];
const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

const COLOR_SWATCHES: { name: string; classes: string[] }[] = [
  { name: 'Accent (terracotta)', classes: ['bg-ground', 'bg-surface', 'bg-accent', 'bg-accent-hover'] },
  { name: 'Ink & line (neutral)', classes: ['bg-line', 'bg-line-strong', 'bg-ink-subtle', 'bg-ink'] },
  { name: 'Green (success)', classes: ['bg-green-100', 'bg-green-400', 'bg-green-600', 'bg-green-800'] },
  { name: 'Amber (warning)', classes: ['bg-amber-100', 'bg-amber-400', 'bg-amber-600', 'bg-amber-800'] },
  { name: 'Red (danger)', classes: ['bg-red-100', 'bg-red-400', 'bg-red-600', 'bg-red-800'] },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Design System</h1>
        <p className="mt-1 text-ink-muted">Reusable Tailwind-based UI components for Recipe Box.</p>
      </header>

      <Section title="Color palette">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink-muted">{swatch.name}</p>
              <div className="flex overflow-hidden rounded-md">
                {swatch.classes.map((c) => (
                  <div key={c} className={`h-10 flex-1 ${c}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold text-ink">Heading 1</h1>
          <h2 className="font-display text-2xl font-semibold text-ink">Heading 2</h2>
          <h3 className="font-display text-xl font-semibold text-ink">Heading 3</h3>
          <h4 className="font-display text-lg font-medium text-ink">Heading 4</h4>
          <p className="text-base text-ink-muted">Body text — used for regular content.</p>
          <p className="text-sm text-ink-muted">Small / caption text.</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          {BUTTON_SIZES.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-3">
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant}
                </Button>
              ))}
              <Button size={size} disabled>
                disabled
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input label="Recipe title" placeholder="e.g. Tomato Pasta" />
          <Input label="With error" placeholder="e.g. 2 cups flour" error="This field is required" />
          <div className="flex items-center gap-2">
            <Input label="Quantity (hideLabel example)" hideLabel type="number" defaultValue={2} className="w-20" />
            <span className="text-sm text-ink-muted">gallon — label is present for screen readers, hidden visually</span>
          </div>
          <Textarea label="Steps" placeholder="1. Boil water..." />
          <Select
            label="Unit"
            options={[
              { label: 'Cups', value: 'cups' },
              { label: 'Grams', value: 'grams' },
              { label: 'Pieces', value: 'pieces' },
            ]}
          />
          <div className="flex flex-col gap-2">
            <Checkbox label="Mark as favorite" defaultChecked />
            <Checkbox label="Vegetarian" />
            <Checkbox label="Milk — 1 gallon (size=lg, for a bigger tap target)" size="lg" defaultChecked />
          </div>
          <div className="flex flex-col gap-2">
            <Radio label="Metric" name="unit-system" defaultChecked />
            <Radio label="Imperial" name="unit-system" />
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </Section>

      <Section title="Card">
        <div className="max-w-sm">
          <Card>
            <CardHeader>Tomato Pasta</CardHeader>
            <CardBody>4 ingredients &middot; 6 steps &middot; 25 min</CardBody>
            <CardFooter>Added 2 days ago</CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Alerts">
        <div className="flex flex-col gap-3">
          <Alert variant="info" title="Heads up">
            Ingredient quantities are combined automatically across selected recipes.
          </Alert>
          <Alert variant="success" title="Saved">
            Your recipe was saved to the recipe box.
          </Alert>
          <Alert variant="warning" title="Missing ingredient">
            One recipe is missing a quantity for &quot;salt&quot;.
          </Alert>
          <Alert variant="danger" title="Couldn&apos;t save">
            Check your connection and try again.
          </Alert>
        </div>
      </Section>

      <Section title="Empty, loading and error states">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-muted">EmptyState — with action</p>
            <EmptyState
              title="No recipes yet"
              description="Save your first recipe to start building your recipe box."
              action={<Button size="sm">Add a recipe</Button>}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-muted">EmptyState — description only</p>
            <EmptyState
              title="No shopping list yet"
              description="Select recipes and generate a list to see it here."
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-muted">LoadingState</p>
            <LoadingState label="Loading recipes…" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-muted">ErrorState — with retry and code</p>
            <ErrorState
              message="Couldn't load your recipes. Check your connection."
              code="NETWORK_ERROR"
              onRetry={() => undefined}
            />
          </div>
        </div>
      </Section>

      <Section title="Modal">
        <div>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal open={modalOpen} title="Delete recipe?" onClose={() => setModalOpen(false)}>
            <p>This can&apos;t be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => setModalOpen(false)}>
                Delete
              </Button>
            </div>
          </Modal>
        </div>
      </Section>
    </main>
  );
}
