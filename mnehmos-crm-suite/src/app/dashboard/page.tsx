import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, user ID: {userId}</p>
    </div>
  );
}