export default function access(initialState: any) {
  const user = initialState?.currentUser;
  const role = user?.role;

  return {
    isLogin: !!user, // 🔥 THÊM DÒNG NÀY

    isAdmin: role === 'ADMIN',
    isResident: role === 'RESIDENT',
  };
}