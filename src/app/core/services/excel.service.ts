import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Actividad } from '../models/actividad.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  async leerExcel(archivo: File): Promise<Actividad[]> {
    const data = await archivo.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convertimos la hoja a JSON
    const json = XLSX.utils.sheet_to_json(worksheet);
    
    // Mapeamos el JSON a nuestra interfaz Actividad
    return json.map((row: any) => ({
      colaborador: row['COLABORADOR'] || row['Colaborador'],
      proyecto: row['PROYECTO'] || row['Proyecto'],
      cliente: row['CLIENTE'] || row['Cliente'],
      liderTecnico: row['LÍDER TÉCNICO'] || row['Lider'],
      nroHoras: Number(row['NRO DE HORAS'] || row['Horas']),
      estado: 'Cargado'
    }));
  }
}