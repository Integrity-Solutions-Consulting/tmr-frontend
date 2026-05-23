export interface PersonaMock {
  id: string;
  nombres: string;
  apellidos: string;
  identificacion: string;
  fechaNacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
}

export const PERSONAS_MOCK: PersonaMock[] = [
  { id: 'PER-001', nombres: 'Valeria',   apellidos: 'Pazmiño',    identificacion: '1712345678', fechaNacimiento: '1992-03-14', genero: 'Femenino'  },
  { id: 'PER-002', nombres: 'Ricardo',   apellidos: 'Molina',     identificacion: '1798765432', fechaNacimiento: '1988-07-22', genero: 'Masculino' },
  { id: 'PER-003', nombres: 'Samantha',  apellidos: 'Salcedo',    identificacion: '1756789012', fechaNacimiento: '1995-11-05', genero: 'Femenino'  },
  { id: 'PER-004', nombres: 'Daniel',    apellidos: 'Erazo',      identificacion: '1734567890', fechaNacimiento: '1990-01-30', genero: 'Masculino' },
  { id: 'PER-005', nombres: 'Fernanda',  apellidos: 'Benavides',  identificacion: '1723456789', fechaNacimiento: '1993-08-17', genero: 'Femenino'  },
  { id: 'PER-006', nombres: 'Carlos',    apellidos: 'Iturralde',  identificacion: '1767890123', fechaNacimiento: '1985-04-09', genero: 'Masculino' },
  { id: 'PER-007', nombres: 'María',     apellidos: 'Guzmán',     identificacion: '1745678901', fechaNacimiento: '1997-12-21', genero: 'Femenino'  },
  { id: 'PER-008', nombres: 'Luis',      apellidos: 'Yánez',      identificacion: '1789012345', fechaNacimiento: '1986-06-03', genero: 'Masculino' },
  { id: 'PER-009', nombres: 'Andrea',    apellidos: 'Torres',     identificacion: '1778901234', fechaNacimiento: '1994-09-28', genero: 'Femenino'  },
  { id: 'PER-010', nombres: 'Jorge',     apellidos: 'Ramírez',    identificacion: '1701234567', fechaNacimiento: '1989-02-14', genero: 'Masculino' },
  { id: 'PER-011', nombres: 'Paola',     apellidos: 'Vega',       identificacion: '1712098765', fechaNacimiento: '1996-05-11', genero: 'Femenino'  },
  { id: 'PER-012', nombres: 'Miguel',    apellidos: 'Herrera',    identificacion: '1734509876', fechaNacimiento: '1991-10-07', genero: 'Masculino' },
  { id: 'PER-013', nombres: 'Gabriela',  apellidos: 'Castillo',   identificacion: '1756091234', fechaNacimiento: '1998-03-25', genero: 'Femenino'  },
  { id: 'PER-014', nombres: 'Sebastián', apellidos: 'Albán',      identificacion: '1723487650', fechaNacimiento: '1987-07-19', genero: 'Masculino' },
  { id: 'PER-015', nombres: 'Camila',    apellidos: 'Proaño',     identificacion: '1767123456', fechaNacimiento: '1999-01-08', genero: 'Femenino'  },
];
