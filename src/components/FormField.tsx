interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "textarea";
  placeholder?: string;
  required?: boolean;
  rows?: number;
  large?: boolean;
}

export function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  rows = 4,
  large = false,
}: FormFieldProps) {
  const inputClasses =
    "w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-200";

  const textareaClasses = large
    ? `${inputClasses} resize-y min-h-[12rem] md:min-h-[15rem] leading-relaxed`
    : `${inputClasses} resize-y min-h-[7rem] md:min-h-[8rem] leading-relaxed`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-zinc-800">
        {label}
        {required && <span className="font-normal text-zinc-500"> *</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={textareaClasses}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClasses} min-h-[48px]`}
          autoComplete="off"
        />
      )}
    </div>
  );
}
