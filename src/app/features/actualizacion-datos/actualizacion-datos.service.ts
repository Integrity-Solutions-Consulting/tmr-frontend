import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
export interface Persona { nombres:string; apellidos:string; email?:string; telefono?:string; direccion?:string; }
export interface Formacion { nivel:string; institucion:string; titulo:string; fechaInicio?:string; fechaFin?:string; }
export interface Certificacion { nombre:string; entidadEmisora:string; fechaEmision:string; fechaVencimiento?:string; }
export interface MisDatos { solicitudId?:number; estado:string; observacion?:string; persona:Persona; formaciones:Formacion[]; certificaciones:Certificacion[]; archivos:any[]; familia?:any; }
@Injectable({providedIn:'root'}) export class ActualizacionDatosService {
 private http=inject(HttpClient); private base=`${environment.apiUrl}`;
 getMine():Observable<MisDatos>{return this.http.get<MisDatos>(`${this.base}/mis-datos`);}
 save(data:any){return this.http.put(`${this.base}/mis-datos`,{...data,enviar:false});}
 uploadDirect(file:File,seccion:string,referenciaId?:number,referenciaClave?:string,replaceId?:number){const fd=new FormData();fd.append('file',file,file.name);let params=new HttpParams().set('seccion',seccion);if(referenciaId)params=params.set('referenciaId',referenciaId);if(referenciaClave)params=params.set('referenciaClave',referenciaClave);if(replaceId)params=params.set('replaceId',replaceId);return this.http.post(`${this.base}/mis-datos/archivos`,fd,{params});}
 downloadMine(id:number){return this.http.get(`${this.base}/mis-datos/archivos/${id}`,{responseType:'blob'});}
 deleteMineDocument(id:number){return this.http.delete(`${this.base}/mis-datos/archivos/${id}`);}
 solicitudes(){return this.http.get<any[]>(`${this.base}/mis-datos/solicitudes`);}
 crearSolicitud(data:any){return this.http.post<{id:number}>(`${this.base}/mis-datos/solicitudes`,data);}
 uploadSolicitud(id:number,file:File){const fd=new FormData();fd.append('file',file,file.name);return this.http.post(`${this.base}/mis-datos/solicitudes/${id}/archivos`,fd);}
 downloadSolicitud(id:number,fileId:number){return this.http.get(`${this.base}/mis-datos/solicitudes/${id}/archivos/${fileId}`,{responseType:'blob'});}
 deleteSolicitudDocument(id:number,fileId:number){return this.http.delete(`${this.base}/mis-datos/solicitudes/${id}/archivos/${fileId}`);}
 list(search='',status='',page=1,size=20){let p=new HttpParams().set('page',page).set('size',size);if(search)p=p.set('search',search);if(status)p=p.set('status',status);return this.http.get<any[]>(`${this.base}/actualizaciones-datos`,{params:p});}
 review(id:number,version:number,approve:boolean,observacion?:string){return this.http.post(`${this.base}/actualizaciones-datos/${id}/${approve?'aprobar':'devolver'}`,{version,observacion});}
 detail(id:number){return this.http.get<any>(`${this.base}/actualizaciones-datos/${id}`);}
 getExpediente(id:number){return this.http.get<any>(`${this.base}/colaboradores/${id}/expediente`);}
 downloadExpedienteFile(id:number,fileId:number){return this.http.get(`${this.base}/colaboradores/${id}/expediente/archivos/${fileId}`,{responseType:'blob'});}
 downloadReview(id:number,fileId:number){return this.http.get(`${this.base}/actualizaciones-datos/${id}/archivos/${fileId}`,{responseType:'blob'});}
}
