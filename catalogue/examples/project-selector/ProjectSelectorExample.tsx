import {useState} from 'react';
import {ProjectSelector} from '@da-facility/ui';
import {PROJECTS} from './projects';
import './project-selector-example.css';

export function ProjectSelectorExample() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [fewProjectId, setFewProjectId] = useState('harbour');
  const [status, setStatus] = useState('');

  return <main className="project-selector-example">
    <h1>Project selector</h1>
    <p>Open a menu and start typing: the search widens as soon as there is a query. Escape clears it, and a second Escape closes the menu.</p>
    <div className="project-selector-example__variants">
      <section>
        <h2>Many projects, with a create action</h2>
        <ProjectSelector
          projects={PROJECTS}
          value={projectId}
          onChange={setProjectId}
          onCreate={() => setStatus('Create project selected. This demo does not create anything.')}
        />
      </section>
      <section>
        <h2>A few projects</h2>
        <ProjectSelector projects={PROJECTS.slice(0, 3)} value={fewProjectId} onChange={setFewProjectId} />
      </section>
    </div>
    <p className="project-selector-example__status" role="status">{status || `Selected: ${PROJECTS.find(project => project.id === projectId)?.name}`}</p>
  </main>;
}
