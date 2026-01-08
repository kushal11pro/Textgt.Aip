export const getApiKey = (): string => {
  return process.env.API_KEY || '';
};

export const hasValidKey = (): boolean => {
  return !!getApiKey();
};