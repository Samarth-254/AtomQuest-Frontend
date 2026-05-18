export default function SubmitButton({ children, loading = false }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-[12px] px-[24px] mt-[8px] bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors flex items-center justify-center gap-[8px] disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading ? "Signing In..." : children}

      {!loading && (
        <span className="material-symbols-outlined text-[18px]">
          arrow_forward
        </span>
      )}
    </button>
  );
}
