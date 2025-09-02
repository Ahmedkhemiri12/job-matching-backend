import db from '../db/database.js';

export const seedJobs = async () => {
  try {
    const jobs = [
      {
        title: 'Full Stack Developer',
        company: 'TechCorp Berlin',
        description: 'We are looking for a passionate Full Stack Developer to join our growing team.',
        required_skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express']),
        nice_to_have_skills: JSON.stringify(['TypeScript', 'AWS', 'Docker', 'GraphQL']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        description: 'Join our innovative team as a Frontend Developer and help us build amazing user experiences.',
        required_skills: JSON.stringify(['React', 'CSS', 'JavaScript', 'HTML', 'Tailwind CSS']),
        nice_to_have_skills: JSON.stringify(['Next.js', 'TypeScript', 'Figma']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Backend Developer',
        company: 'DataTech Solutions',
        description: 'Looking for an experienced Backend Developer to work on scalable APIs and microservices.',
        required_skills: JSON.stringify(['Node.js', 'Python', 'PostgreSQL', 'REST API', 'Docker']),
        nice_to_have_skills: JSON.stringify(['Kubernetes', 'Redis', 'GraphQL', 'AWS']),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    await db('jobs').insert(jobs);
    console.log('Sample jobs created');
  } catch (error) {
    console.error('Seed error:', error);
  }
};