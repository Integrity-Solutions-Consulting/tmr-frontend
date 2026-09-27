import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

interface TemplateItem {
  name: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

@Component({
  selector: 'app-gestor-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './gestor-plantillas.component.html',
  styleUrl: './gestor-plantillas.component.scss'
})
export class GestorPlantillasComponent implements OnInit {
  private http = inject(HttpClient);
  
  // Como el ms de documentos corre en el puerto 3000 (o 3001) y no en el de .NET:
  private documentServiceUrl = 'http://localhost:3000/api'; 

  templates: TemplateItem[] = [];
  isLoading = false;
  selectedFile: File | null = null;
  uploadStatus: string | null = null;

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates() {
    this.isLoading = true;
    this.http.get<{ templates: TemplateItem[] }>(`${this.documentServiceUrl}/templates`)
      .subscribe({
        next: (res) => {
          this.templates = res.templates;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar plantillas', err);
          this.isLoading = false;
        }
      });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadTemplate() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploadStatus = 'Subiendo...';

    this.http.post<{ message: string, filename: string }>(`${this.documentServiceUrl}/templates/upload`, formData)
      .subscribe({
        next: (res) => {
          this.uploadStatus = 'Éxito: ' + res.message;
          this.selectedFile = null;
          this.loadTemplates(); // recargar la lista
          
          setTimeout(() => this.uploadStatus = null, 3000);
        },
        error: (err) => {
          console.error('Error al subir plantilla', err);
          this.uploadStatus = 'Error al subir la plantilla';
        }
      });
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
