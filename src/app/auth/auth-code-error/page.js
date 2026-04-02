import Link from "next/link";

export const metadata = {
  title: "Sign-in error",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold text-gray-900">Could not sign you in</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Something went wrong while completing Google sign-in. Try again, or contact support if the
        problem continues.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex w-fit rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
