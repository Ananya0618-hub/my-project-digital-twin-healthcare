let userData: any = null;

export const setUser = (user: any) => {
  userData = user;
};

export const getUser = () => {
  return userData;
};

export const clearUser = () => {
  userData = null;
};