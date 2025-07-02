
export interface CrewMember {
  id: string;
  name: string;
  role: string;
  department: string;
  contact?: string;
  notes?: string;
}

export interface CrewDepartment {
  id: string;
  name: string;
  members: CrewMember[];
  headOfDepartment?: string;
}

export interface CrewData {
  departments: CrewDepartment[];
  totalMembers: number;
  lastUpdated: string;
}
