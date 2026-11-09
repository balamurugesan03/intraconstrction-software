import ResourceList from '../../components/ResourceList';
import { projects } from '../../config/resources';

export default function ProjectsTab() {
  return <ResourceList config={projects} />;
}
