import { Field, Input, Select, Textarea } from "@/components/ui";
import { AmountInput } from "@/components/application/amount-input";
import type { Question } from "@/lib/questions";

/**
 * Renders any question from configuration.
 *
 * Server component — no client state. The form posts to a server action, so the
 * browser doesn't need JavaScript for the flow to work. That matters more than
 * usual here: applicants are often on a phone, on site, on a bad connection.
 *
 * Adding a question type means adding a case here and to the enum in migration
 * 0001. Everything else stays untouched.
 */
export function QuestionField({
  question,
  defaultValue,
  error,
}: {
  question: Question;
  defaultValue?: string;
  error?: string;
}) {
  const id = `q-${question.key}`;
  const { validation } = question;

  const shared = {
    id,
    name: question.key,
    required: question.isRequired,
    defaultValue,
    // Regulated fields should never be offered up by browser autofill or
    // captured by password managers.
    autoComplete: question.isPii ? ("off" as const) : undefined,
  };

  return (
    <Field
      label={question.label}
      htmlFor={id}
      hint={question.helpText ?? undefined}
      error={error}
      required={question.isRequired}
    >
      {renderControl()}
    </Field>
  );

  function renderControl() {
    switch (question.type) {
      case "select":
        return (
          <Select {...shared}>
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case "boolean":
        return (
          <Select {...shared}>
            <option value="">Select an option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        );

      case "textarea":
        return (
          <Textarea {...shared} placeholder={question.placeholder ?? undefined} />
        );

      case "currency":
        return (
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-500"
            >
              $
            </span>
            {/* Grouped with commas as you type — see amount-input.tsx for why
                this is not a number input. Range is enforced server-side; a
                text input cannot carry min/max. */}
            <AmountInput
              {...shared}
              placeholder={question.placeholder ?? "0"}
              className="pl-7"
            />
          </div>
        );

      case "percent":
        return (
          <div className="relative">
            <Input
              {...shared}
              type="number"
              inputMode="decimal"
              step="any"
              min={validation.min ?? 0}
              max={validation.max ?? 100}
              placeholder={question.placeholder ?? "0"}
              className="pr-9"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-500"
            >
              %
            </span>
          </div>
        );

      case "number":
        return (
          <Input
            {...shared}
            type="number"
            inputMode="numeric"
            min={validation.min}
            max={validation.max}
            placeholder={question.placeholder ?? undefined}
          />
        );

      case "date":
        return <Input {...shared} type="date" />;

      case "email":
        return (
          <Input
            {...shared}
            type="email"
            inputMode="email"
            placeholder={question.placeholder ?? "name@company.com"}
          />
        );

      case "phone":
        return (
          <Input
            {...shared}
            type="tel"
            inputMode="tel"
            placeholder={question.placeholder ?? "(555) 555-0100"}
          />
        );

      default:
        return (
          <Input
            {...shared}
            type="text"
            pattern={validation.pattern}
            placeholder={question.placeholder ?? undefined}
          />
        );
    }
  }
}
