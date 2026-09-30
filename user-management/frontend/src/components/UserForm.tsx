import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiRequestError } from '../services/apiError';
import type { CreateUserRequest } from '../types/user';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  EMPTY_USER_FORM,
  toUserRequest,
  validateUserForm,
  type UserFormErrors,
  type UserFormValues,
} from '../utils/userForm';
import { ErrorMessage } from './ErrorMessage';

interface UserFormProps {
  initialValues?: UserFormValues;
  submitLabel: string;
  /** Called with validated, typed data. If it throws, the form shows the error. */
  onSubmit: (input: CreateUserRequest) => Promise<void>;
}

const FIELDS: { name: keyof UserFormValues; label: string; type: string }[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'age', label: 'Age', type: 'number' },
];

/**
 * Shared by the Create and Edit pages. It owns the form state and validation;
 * the page decides what "submit" means (create vs update, where to navigate).
 */
export function UserForm({
  initialValues = EMPTY_USER_FORM,
  submitLabel,
  onSubmit,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(initialValues);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser's default full-page form submission

    const validationErrors = validateUserForm(values);
    setErrors(validationErrors);
    setSubmitError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(toUserRequest(values));
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      // Show the backend's per-field messages next to the matching inputs.
      if (err instanceof ApiRequestError) {
        const serverErrors: UserFormErrors = {};
        for (const { field, message } of err.fieldErrors) {
          if (field === 'name' || field === 'email' || field === 'age')
            serverErrors[field] = message;
        }
        setErrors(serverErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form">
      {submitError && <ErrorMessage message={submitError} />}

      {FIELDS.map((field) => {
        const error = errors[field.name];
        const errorId = `${field.name}-error`;
        return (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              value={values[field.name]}
              onChange={handleChange}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            {error && (
              <span id={errorId} className="field-error">
                {error}
              </span>
            )}
          </div>
        );
      })}

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
