export const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date().setHours(0, 0, 0, 0);
};

export const isDueToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
};

export const TEAM_MEMBERS = [
  { id: 'user-1', name: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix' },
  { id: 'user-2', name: 'Sam Lee', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Milo' },
  { id: 'user-3', name: 'Jordan Kim', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Jasper' },
  { id: 'user-4', name: 'Morgan Park', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo' },
  { id: 'user-5', name: 'Taylor', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya' },
];
