export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const initialData = {
  tasks: {
    'task-1': {
      id: 'task-1',
      title: 'Speed exploit in Spire of Echoes - Lobby 03',
      priority: 'High',
      tags: ['Exploit'],
      metrics: { comments: 3, attachments: 2 },
      code: 'SKY-4565',
      description: '',
      assigneeImg: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aria',
      dueDate: '2025-05-15',
      attachments: [
        { id: 'a1', type: 'image', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop', name: 'screenshot-lobby.png' },
        { id: 'a2', type: 'image', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop', name: 'repro-steps.png' },
      ],
      comments: [
        { id: 'c1', text: 'Need to verify reproduction steps with QA.', author: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', time: '2h ago' },
        { id: 'c2', text: 'Confirmed in lobby 03 and 07.', author: 'Sam Lee', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Milo', time: '1h ago' },
        { id: 'c3', text: 'Elevating to High priority.', author: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', time: '45m ago' },
      ]
    },
    'task-2': {
      id: 'task-2',
      title: 'Inappropriate username detected by filter',
      priority: 'Medium',
      tags: ['Harassment'],
      metrics: { comments: 1, attachments: 0 },
      code: 'SKY-4621',
      description: '',
      assigneeImg: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
      dueDate: null,
      attachments: [],
      comments: [
        { id: 'c4', text: 'Filter regex needs tuning for edge cases.', author: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', time: '5h ago' },
      ]
    },
    'task-3': {
      id: 'task-3',
      title: 'Cosmetic dupe glitch — Glove of Miro',
      priority: 'High',
      tags: ['Exploit'],
      metrics: { comments: 12, attachments: 0 },
      code: 'SKY-4702',
      description: '',
      assigneeImg: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Oliver',
      dueDate: '2025-05-18',
      attachments: [],
      comments: [
        { id: 'c5', text: 'This is being actively exploited in trading.', author: 'Jordan', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Jasper', time: '1d ago' },
        { id: 'c6', text: 'Can we push a hotfix without downtime?', author: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', time: '20h ago' },
      ]
    },
    'task-4': {
      id: 'task-4',
      title: 'Crash on map load — Tundra Pass',
      priority: 'Low',
      tags: ['Bug'],
      metrics: { comments: 4, attachments: 0 },
      code: 'SKY-4690',
      description: '',
      assigneeImg: null,
      dueDate: '2025-05-30',
      attachments: [],
      comments: [
        { id: 'c7', text: 'Only reproducible on older GPUs.', author: 'Taylor', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya', time: '3d ago' },
      ]
    },
    'task-5': {
      id: 'task-5',
      title: 'Leaked dev build seen on Discord server invite',
      priority: 'Critical',
      tags: ['Leak'],
      metrics: { comments: 24, attachments: 0 },
      code: 'SKY-4717',
      description: '',
      assigneeImg: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe',
      dueDate: '2025-05-12',
      attachments: [],
      comments: [
        { id: 'c8', text: 'Legal has been notified.', author: 'Chatgpt_niy', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', time: '30m ago' },
        { id: 'c9', text: 'Invite link is already dead.', author: 'Morgan', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo', time: '25m ago' },
      ]
    },
  },
  columns: {
    'col-1': { id: 'col-1', title: 'Inbox', taskIds: ['task-1', 'task-2'] },
    'col-2': { id: 'col-2', title: 'Triage', taskIds: ['task-3', 'task-4'] },
    'col-3': { id: 'col-3', title: 'Investigating', taskIds: ['task-5'] },
  },
  columnOrder: ['col-1', 'col-2', 'col-3']
};
