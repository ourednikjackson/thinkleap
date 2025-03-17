import { auth, currentUser } from '@clerk/nextjs';

export async function getCurrentUser() {
  const user = await currentUser();
  return user;
}

export async function getUserId() {
  const { userId } = auth();
  return userId;
}

export async function isAuthenticated() {
  const { userId } = auth();
  return !!userId;
}
