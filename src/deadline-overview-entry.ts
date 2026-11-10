import './trip-deadline-handoff.css';
import './deadline-overview.css';
import { read } from './store';
import { bindDeadlineOverview } from './deadline-overview-ui';

bindDeadlineOverview({ read });
