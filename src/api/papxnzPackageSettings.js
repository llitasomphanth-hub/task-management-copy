import { base44 } from '@/api/base44Client';

// @/api boundary for the PAPXNZ package-setting source of truth.
// The browser never receives PAPXNZ_BASE44_SERVICE_KEY.
const invoke = async (command, payload = {}) => {
  const response = await base44.functions.invoke('papxnz-package-settings', {
    command,
    ...payload,
  });
  return response.data;
};

export const createPapxnzPackage = (payload) => invoke('create', payload);
export const updatePapxnzPackage = (payload) => invoke('update', payload);
export const disablePapxnzPackage = (package_id) =>
  invoke('disable', { package_id });
