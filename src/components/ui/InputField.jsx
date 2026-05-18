export default function InputField({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  icon,
  value,
  onChange,
  rightText,
  rightLink = '#',
}) {
  return (
    <div className="flex flex-col space-y-[8px]">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="font-label-md text-label-md text-on-surface"
        >
          {label}
        </label>

        {rightText && (
          <a
            href={rightLink}
            className="font-label-sm text-label-sm text-primary hover:text-on-primary-fixed-variant hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
          >
            {rightText}
          </a>
        )}
      </div>

      <div className="relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-[12px] text-on-surface-variant text-[20px] pointer-events-none">
            {icon}
          </span>
        )}

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full pl-[40px] pr-[12px] py-[12px] bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>
    </div>
  );
}