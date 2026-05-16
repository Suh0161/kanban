import { useState, useMemo } from 'react';
import { Briefcase, Inbox } from 'lucide-react';
import MyTasksView from '../mytasks';
import InboxView from '../inbox';
import './css/mywork.css';

const tabs = [
  { id: 'my-tasks', label: 'My Tasks', icon: Briefcase },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
];

export default function MyWorkView({ tasks, columns, columnOrder, onSelectTask, onMoveTask, onUpdateTask, user }) {
  const [activeTab, setActiveTab] = useState('my-tasks');

  // Count inbox tasks for badge
  const inboxCount = useMemo(
    () => tasks.filter(t => t.columnTitle === 'Inbox').length,
    [tasks]
  );

  return (
    <div className="mywork-view">
      <div className="mywork-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`mywork-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'inbox' && inboxCount > 0 && (
                <span className="mywork-tab-badge">{inboxCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'my-tasks' && (
        <MyTasksView
          tasks={tasks}
          columns={columns}
          columnOrder={columnOrder}
          onSelectTask={onSelectTask}
          onMoveTask={onMoveTask}
          onUpdateTask={onUpdateTask}
          user={user}
        />
      )}

      {activeTab === 'inbox' && (
        <InboxView
          tasks={tasks}
          columns={columns}
          columnOrder={columnOrder}
          onSelectTask={onSelectTask}
          onMoveTask={onMoveTask}
          onUpdateTask={onUpdateTask}
        />
      )}
    </div>
  );
}
