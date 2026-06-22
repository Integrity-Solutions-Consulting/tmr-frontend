# Implementación: Token Refresh Inteligente con Detección de Actividad

## 📋 Resumen Ejecutivo

Implementar un flujo mejorado de renovación de tokens que detecte la actividad del usuario 1 minuto antes de la expiración del Access Token (AT). Si hay actividad, el refresh será automático y silencioso; si no hay actividad, se mostrará un modal con countdown para que el usuario decida extender la sesión.

---

## 🎯 Flujo Propuesto

```
Token próximo a expirar (1 minuto)
    ↓
¿Hay actividad del usuario?
    ├─ SÍ → Refresh automático, silencioso, sin modal
    │        └─ Reiniciar monitoreo
    │
    └─ NO → Mostrar modal con countdown de 60 segundos
            ├─ Usuario acepta → Refresh y extender sesión
            ├─ Countdown llega a 0 → Logout automático
            └─ Usuario rechaza → Logout inmediato
```

---

## 📂 Ruta de Implementación

### **PASO 1: Crear UserActivityService**
**Archivo:** `tmr-frontend/src/app/core/services/user-activity.service.ts`

**Responsabilidad:** Detectar y rastrear la actividad del usuario

**Eventos a monitorear:**
- Movimiento del ratón
- Clics
- Pulsaciones de teclas
- Scrolling
- Cambios de focus en ventanas

**Métodos principales:**
```typescript
- startTracking(): void                    // Inicia el monitoreo de actividad
- stopTracking(): void                     // Detiene el monitoreo
- resetActivityTimer(): void               // Reinicia el timer de inactividad
- isUserActive(withinLastSeconds: number): boolean  // Verifica si hay actividad reciente
- getLastActivityTime(): number            // Retorna timestamp del último evento
- getSecondsSinceLastActivity(): number    // Retorna segundos desde última actividad
```

**Detalles técnicos:**
- Usar un timestamp para rastrear el último evento
- Usar `throttle` (200ms) para evitar demasiados eventos
- Monitorear solo cuando esté logueado
- Limpiar listeners al logout

---

### **PASO 2: Modificar TokenMonitorService**
**Archivo:** `tmr-frontend/src/app/core/services/token-monitor.service.ts`

**Cambios:**
1. Inyectar `UserActivityService`
2. Modificar evento `onExpirationWarning` para incluir información de actividad
3. Crear dos nuevos métodos:
   - `onExpirationWarningWithActivity()`: Retorna `{ hasActivity: boolean }`
   - `requiresModalDisplay()`: Determina si mostrar modal

**Flujo en startMonitoring():**
```
Cada 10 segundos:
  ├─ Si faltan 60 segundos:
  │  ├─ Consultar UserActivityService si hay actividad
  │  ├─ Si hay actividad:
  │  │  └─ Emitir evento: onSilentRefreshNeeded()
  │  └─ Si NO hay actividad:
  │     └─ Emitir evento: onExpirationWarning() [muestra modal]
  │
  └─ Si faltan 0 segundos o menos:
     └─ Emitir onTokenExpired()
```

---

### **PASO 3: Crear SessionExpirationModalComponent (mejorado)**
**Archivo:** `tmr-frontend/src/app/core/components/session-expiration-modal/session-expiration-modal.component.ts`

**Cambios:**
1. Añadir countdown visual de 60 segundos
2. Mostrar información del usuario que se está desconectando
3. Botones: "Extender Sesión" y "Cerrar Sesión"
4. Auto-cerrar cuando countdown llega a 0

**Template:**
```html
<div class="session-expiration-modal">
  <h2>Sesión próxima a expirar</h2>
  <p>No detectamos actividad. Por seguridad, tu sesión se cerrará en:</p>
  
  <div class="countdown">
    <span class="time">{{ secondsRemaining }}s</span>
  </div>
  
  <div class="actions">
    <button mat-raised-button color="accent" (click)="extendSession()">
      Extender Sesión
    </button>
    <button mat-button (click)="logout()">
      Cerrar Sesión
    </button>
  </div>
</div>
```

---

### **PASO 4: Modificar AppComponent**
**Archivo:** `tmr-frontend/src/app/app.component.ts`

**Cambios principales:**

1. **Inyectar UserActivityService:**
```typescript
private userActivity = inject(UserActivityService);
```

2. **En ngOnInit():**
```typescript
// Iniciar tracking de actividad cuando hay token válido
if (this.tokenService.isTokenValid()) {
  this.userActivity.startTracking();        // ← NUEVO
  this.tokenMonitor.startMonitoring();
}

// Escuchar refresh silencioso (con actividad)
this.tokenMonitor
  .onSilentRefreshNeeded()                  // ← NUEVO
  .pipe(takeUntil(this.destroy$))
  .subscribe(() => {
    console.log('🔄 Actividad detectada - Refresh automático...');
    this.performSilentRefresh();
  });

// Escuchar advertencia de expiración (sin actividad)
this.tokenMonitor
  .onExpirationWarning()                    // ← MODIFICADO
  .pipe(takeUntil(this.destroy$))
  .subscribe(() => {
    console.log('⚠️ Sin actividad - Mostrando modal...');
    this.showExpirationModal();
  });
```

3. **Nuevo método: performSilentRefresh()**
```typescript
private performSilentRefresh(): void {
  this.authService.refreshTokenRequest().subscribe({
    next: (response: AuthResponse) => {
      console.log('✅ Token refrescado automáticamente');
      this.authService.updateTokens(response);
      // Reiniciar monitoreo sin detener, continuar en background
      this.tokenMonitor.stopMonitoring();
      this.tokenMonitor.startMonitoring();
    },
    error: (err) => {
      console.error('❌ Error en refresh automático:', err);
      this.handleTokenExpired();
    }
  });
}
```

4. **En ngOnDestroy():**
```typescript
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.userActivity.stopTracking();         // ← NUEVO
  this.tokenMonitor.stopMonitoring();
}
```

5. **Modificar handleTokenExpired():**
```typescript
private handleTokenExpired(): void {
  console.log('🔐 Sesión expirada');
  if (this.currentDialogRef) {
    this.currentDialogRef.close();
  }
  this.userActivity.stopTracking();         // ← NUEVO
  this.tokenMonitor.stopMonitoring();
  this.tokenService.clear();
  this.router.navigate(['/auth/login'], {
    queryParams: { reason: 'session-expired' }
  });
}
```

---

### **PASO 5: Configuración de Constantes**
**Archivo:** `tmr-frontend/src/app/core/config/token.config.ts` (crear si no existe)

```typescript
export const TOKEN_CONFIG = {
  // Tiempo antes de expiración para mostrar alerta (en segundos)
  EXPIRATION_WARNING_SECONDS: 60,
  
  // Tiempo de inactividad para considerar al usuario inactivo (en segundos)
  // Si no hay actividad en este período, mostrar modal en la alerta
  ACTIVITY_CHECK_WINDOW: 60,
  
  // Intervalo de verificación del token (en milisegundos)
  CHECK_INTERVAL_MS: 10000,
  
  // Throttle para eventos de actividad (en milisegundos)
  ACTIVITY_THROTTLE_MS: 200,
  
  // Tiempo máximo para que el usuario responda al modal (en segundos)
  MODAL_RESPONSE_TIMEOUT: 60
};
```

---

## 🔧 Implementación Detallada por Archivo

### 1️⃣ UserActivityService (nuevo)

**Ubicación:** `src/app/core/services/user-activity.service.ts`

```typescript
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { TOKEN_CONFIG } from '../config/token.config';

@Injectable({
  providedIn: 'root'
})
export class UserActivityService implements OnDestroy {
  private lastActivityTime: number = Date.now();
  private isTracking: boolean = false;
  private listeners: Array<[string, (e: Event) => void, boolean]> = [];
  private throttleTimeout: any;

  constructor(private ngZone: NgZone) {}

  /**
   * Inicia el monitoreo de actividad del usuario
   */
  startTracking(): void {
    if (this.isTracking) {
      console.warn('⚠️ UserActivity: Ya está activo');
      return;
    }

    this.isTracking = true;
    this.lastActivityTime = Date.now();

    // Ejecutar fuera de Angular zone para mejor rendimiento
    this.ngZone.runOutsideAngular(() => {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        const listener = this.createActivityListener();
        document.addEventListener(event, listener, { passive: true });
        this.listeners.push([event, listener, true]);
      });

      // Monitorear cambios de focus de ventana
      const focusListener = this.createActivityListener();
      window.addEventListener('focus', focusListener);
      this.listeners.push(['focus', focusListener, false]);
    });

    console.log('✅ UserActivity: Monitoreo iniciado');
  }

  /**
   * Detiene el monitoreo de actividad
   */
  stopTracking(): void {
    if (!this.isTracking) return;

    this.listeners.forEach(([event, listener]) => {
      if (event === 'focus') {
        window.removeEventListener(event, listener);
      } else {
        document.removeEventListener(event, listener, { passive: true } as any);
      }
    });

    this.listeners = [];
    this.isTracking = false;

    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }

    console.log('🛑 UserActivity: Monitoreo detenido');
  }

  /**
   * Retorna si hay actividad dentro de los últimos N segundos
   * @param withinLastSeconds - Número de segundos a verificar
   */
  isUserActive(withinLastSeconds: number = TOKEN_CONFIG.ACTIVITY_CHECK_WINDOW): boolean {
    const timeSinceLastActivity = this.getSecondsSinceLastActivity();
    return timeSinceLastActivity <= withinLastSeconds;
  }

  /**
   * Retorna los segundos desde la última actividad
   */
  getSecondsSinceLastActivity(): number {
    return Math.floor((Date.now() - this.lastActivityTime) / 1000);
  }

  /**
   * Retorna el timestamp de la última actividad
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Limpia recursos
   */
  ngOnDestroy(): void {
    this.stopTracking();
  }

  /**
   * Crea listener de actividad con throttle
   */
  private createActivityListener(): (e: Event) => void {
    return () => {
      if (this.throttleTimeout) {
        return;
      }

      this.lastActivityTime = Date.now();
      console.log('📍 Actividad detectada:', new Date(this.lastActivityTime).toLocaleTimeString());

      this.throttleTimeout = setTimeout(() => {
        this.throttleTimeout = null;
      }, TOKEN_CONFIG.ACTIVITY_THROTTLE_MS);
    };
  }
}
```

---

### 2️⃣ TokenMonitorService (modificaciones)

**Cambios en:** `src/app/core/services/token-monitor.service.ts`

Agregar después del evento `expirationWarning$`:

```typescript
private silentRefreshNeeded$ = new Subject<void>();

/**
 * Observable que emite cuando se debe hacer refresh silencioso
 */
onSilentRefreshNeeded() {
  return this.silentRefreshNeeded$.asObservable();
}
```

Modificar el intervalo de check en `startMonitoring()`:

```typescript
this.ngZone.runOutsideAngular(() => {
  this.checkInterval = setInterval(() => {
    const timeUntilExpiration = this.getTimeUntilExpiration();

    if (this.DEBUG) {
      console.log(`⏱️  TokenMonitor: ${timeUntilExpiration}s hasta expiración`);
    }

    if (timeUntilExpiration <= 0) {
      // Token expiró
      if (this.DEBUG) {
        console.warn('❌ TokenMonitor: TOKEN EXPIRADO');
      }
      this.ngZone.run(() => {
        this.tokenExpired$.next();
      });
      this.stopMonitoring();
    } else if (timeUntilExpiration <= 60 && !this.warningEmitted) {
      // Faltan 60 segundos o menos - VERIFICAR ACTIVIDAD
      const userActivity = inject(UserActivityService);  // ← NUEVO
      const hasActivity = userActivity.isUserActive();   // ← NUEVO

      if (hasActivity) {
        // Hay actividad - refresh silencioso
        if (this.DEBUG) {
          console.log(`✅ TokenMonitor: Actividad detectada - Refresh silencioso`);
        }
        this.warningEmitted = true;
        this.ngZone.run(() => {
          this.silentRefreshNeeded$.next();  // ← NUEVO
        });
      } else {
        // Sin actividad - mostrar modal
        if (this.DEBUG) {
          console.warn(`⚠️  TokenMonitor: ADVERTENCIA DE EXPIRACIÓN (${timeUntilExpiration}s restantes)`);
        }
        this.warningEmitted = true;
        this.ngZone.run(() => {
          this.expirationWarning$.next();
        });
      }
    }
  }, TOKEN_CONFIG.CHECK_INTERVAL_MS);
});
```

---

### 3️⃣ AppComponent (modificaciones)

**Cambios en:** `src/app/app.component.ts`

```typescript
// Agregar inyección
private userActivity = inject(UserActivityService);

// En ngOnInit(), modificar:
ngOnInit(): void {
  if (this.tokenService.isTokenValid()) {
    this.userActivity.startTracking();     // ← NUEVO
    this.tokenMonitor.startMonitoring();
    this.enforcePasswordChange();
  }

  this.router.events
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntil(this.destroy$),
    )
    .subscribe(() => this.enforcePasswordChange());

  // ← NUEVO: Escuchar refresh silencioso
  this.tokenMonitor
    .onSilentRefreshNeeded()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.performSilentRefresh();
    });

  // Escuchar advertencia de expiración (1 minuto antes)
  this.tokenMonitor
    .onExpirationWarning()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.showExpirationModal();
    });

  // Escuchar cuando el token expira
  this.tokenMonitor
    .onTokenExpired()
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      console.log('⏰ Token expirado detectado');
      if (this.currentDialogRef) {
        this.currentDialogRef.close();
      }
      this.handleTokenExpired();
    });
}

// ← NUEVO: Método para refresh silencioso
private performSilentRefresh(): void {
  console.log('🔄 Iniciando refresh automático por actividad...');
  this.authService.refreshTokenRequest().subscribe({
    next: (response: AuthResponse) => {
      console.log('✅ Token refrescado automáticamente');
      this.authService.updateTokens(response);
      
      // Reiniciar monitoreo para siguiente ciclo
      this.tokenMonitor.stopMonitoring();
      this.tokenMonitor.startMonitoring();
      console.log('✅ Sesión extendida automáticamente');
    },
    error: (err) => {
      console.error('❌ Error en refresh automático:', err);
      this.handleTokenExpired();
    }
  });
}

// Modificar ngOnDestroy():
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.userActivity.stopTracking();        // ← NUEVO
  this.tokenMonitor.stopMonitoring();
}

// Modificar handleTokenExpired():
private handleTokenExpired(): void {
  console.log('🔐 Sesión expirada');
  this.userActivity.stopTracking();        // ← NUEVO
  this.tokenMonitor.stopMonitoring();
  this.tokenService.clear();
  this.router.navigate(['/auth/login'], {
    queryParams: { reason: 'session-expired' }
  });
}
```

---

### 4️⃣ SessionExpirationModalComponent (mejoras)

**Cambios en:** `src/app/core/components/session-expiration-modal/session-expiration-modal.component.ts`

```typescript
import { Component, Inject, OnInit, OnDestroy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TOKEN_CONFIG } from '../../config/token.config';

@Component({
  selector: 'app-session-expiration-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="session-expiration-modal">
      <div class="icon-container">
        <mat-icon>schedule</mat-icon>
      </div>
      
      <h2>Sesión próxima a expirar</h2>
      
      <p class="message">
        No detectamos actividad. Por seguridad, tu sesión se cerrará en:
      </p>
      
      <div class="countdown-container">
        <div class="countdown">
          <span class="time">{{ secondsRemaining }}</span>
          <span class="label">segundos</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="(secondsRemaining / totalSeconds) * 100"></div>
        </div>
      </div>
      
      <div class="actions">
        <button mat-raised-button color="accent" (click)="onExtend()">
          Extender Sesión
        </button>
        <button mat-button (click)="onLogout()">
          Cerrar Sesión
        </button>
      </div>
      
      <p class="hint">
        Usa la aplicación para mantener tu sesión activa
      </p>
    </div>
  `,
  styles: [`
    .session-expiration-modal {
      text-align: center;
      padding: 24px;
      min-width: 320px;
    }

    .icon-container {
      margin-bottom: 16px;
      font-size: 48px;
      color: #ff9800;
    }

    h2 {
      margin: 16px 0 8px;
      color: #333;
      font-size: 20px;
    }

    .message {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .countdown-container {
      margin: 32px 0;
    }

    .countdown {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 16px;
    }

    .time {
      font-size: 48px;
      font-weight: bold;
      color: #ff9800;
    }

    .label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .progress-bar {
      height: 4px;
      background-color: #eee;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 16px;
    }

    .progress-fill {
      height: 100%;
      background-color: #ff9800;
      transition: width 1s linear;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin: 24px 0;
    }

    button {
      flex: 1;
    }

    .hint {
      font-size: 12px;
      color: #999;
      margin-top: 16px;
      font-style: italic;
    }
  `]
})
export class SessionExpirationModalComponent implements OnInit, OnDestroy {
  secondsRemaining = TOKEN_CONFIG.MODAL_RESPONSE_TIMEOUT;
  totalSeconds = TOKEN_CONFIG.MODAL_RESPONSE_TIMEOUT;
  private destroy$ = new Subject<void>();
  private dialogRef = inject(MatDialogRef<SessionExpirationModalComponent>);

  ngOnInit(): void {
    // Iniciar countdown de 1 segundo
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.secondsRemaining--;
        
        if (this.secondsRemaining <= 0) {
          console.log('⏰ Timeout del modal - Auto logout');
          this.onTimeout();
        }
      });
  }

  onExtend(): void {
    console.log('✅ Usuario aceptó extender sesión');
    this.dialogRef.close({ action: 'extend' });
  }

  onLogout(): void {
    console.log('❌ Usuario rechazó extender sesión');
    this.dialogRef.close({ action: 'logout' });
  }

  private onTimeout(): void {
    console.log('❌ Timeout - sesión expirada');
    this.dialogRef.close({ action: 'timeout' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

### 5️⃣ Crear archivo de configuración

**Archivo:** `src/app/core/config/token.config.ts`

```typescript
/**
 * Configuración centralizada para manejo de tokens
 */
export const TOKEN_CONFIG = {
  // Tiempo antes de expiración para emitir advertencia (segundos)
  EXPIRATION_WARNING_SECONDS: 60,
  
  // Ventana de tiempo para considerar al usuario activo (segundos)
  // Si no hay actividad en este período, se muestra modal
  ACTIVITY_CHECK_WINDOW: 60,
  
  // Intervalo de verificación del estado del token (milisegundos)
  CHECK_INTERVAL_MS: 10000,
  
  // Throttle para eventos de actividad (milisegundos)
  ACTIVITY_THROTTLE_MS: 200,
  
  // Tiempo de respuesta del modal antes de logout automático (segundos)
  MODAL_RESPONSE_TIMEOUT: 60
};
```

---

## 🔄 Flujo de Datos Mejorado

```
AppComponent
├─ UserActivityService
│  ├─ startTracking()
│  ├─ stopTracking()
│  └─ isUserActive()
│
├─ TokenMonitorService
│  ├─ onSilentRefreshNeeded()
│  ├─ onExpirationWarning()
│  └─ onTokenExpired()
│
└─ AuthService
   └─ refreshTokenRequest()
```

---

## 📊 Matriz de Decisión

| Escenario | Acción |
|-----------|--------|
| Token expira en +60s + **Hay actividad** | ✅ Refresh automático, silencioso |
| Token expira en +60s + **Sin actividad** | ⏳ Mostrar modal con countdown |
| Usuario acepta en modal | ✅ Refresh y extender sesión |
| Usuario rechaza en modal | ❌ Logout inmediato |
| Modal timeout (60s) | ❌ Auto-logout sin respuesta |
| Token expira mientras modal abierto | ❌ Cerrar modal y logout |

---

## ✅ Checklist de Implementación

- [ ] Crear `user-activity.service.ts`
- [ ] Crear `token.config.ts`
- [ ] Modificar `token-monitor.service.ts`
- [ ] Modificar `app.component.ts`
- [ ] Mejorar `session-expiration-modal.component.ts`
- [ ] Importar nuevas inyecciones donde sea necesario
- [ ] Testear flujo con y sin actividad
- [ ] Validar cleanup de listeners al logout
- [ ] Testear casos edge: tab inactiva, múltiples tabs, cambio de enfoque

---

## 🧪 Escenarios de Prueba

### Test 1: Refresh silencioso con actividad
1. Iniciar sesión
2. Hacer click o mover ratón dentro de la ventana
3. Esperar a que falten 60s para expiración
4. ✅ Esperado: Refresh automático sin modal

### Test 2: Modal con inactividad
1. Iniciar sesión
2. Dejar de usar la aplicación (sin movimiento, clics, etc.)
3. Esperar a que falten 60s para expiración
4. ✅ Esperado: Modal con countdown

### Test 3: Aceptar extensión
1. Trigger Test 2
2. Hacer click en "Extender Sesión"
3. ✅ Esperado: Refresh y continuar sesión

### Test 4: Auto-logout por timeout
1. Trigger Test 2
2. No hacer nada, esperar 60s
3. ✅ Esperado: Auto-logout y redirección a login

### Test 5: Logout manual
1. Trigger Test 2
2. Hacer click en "Cerrar Sesión"
3. ✅ Esperado: Logout inmediato y redirección a login

---

## 🐛 Consideraciones de Debugging

Agregar logs con este patrón:
```typescript
console.log('🔄 [TOKEN] Acción específica'); // refresh
console.log('⚠️  [TOKEN] Advertencia');       // warning
console.log('✅ [TOKEN] Exitoso');           // success
console.log('❌ [TOKEN] Error');             // error
console.log('📍 [ACTIVITY] Evento');         // activity
```

Esto facilita filtrar logs en DevTools: `[TOKEN]` o `[ACTIVITY]`

---

## 📝 Notas de Seguridad

1. **Validar token en backend:** Antes de aceptar cualquier refresh, validar que el RT es válido
2. **HTTPS solo en producción:** Asegurar que tokens se envían solo por HTTPS
3. **HttpOnly cookies:** Considerar guardar tokens en cookies HttpOnly (más seguro)
4. **Limpiar listeners:** Asegurar que todos los listeners de actividad se limpian en logout

---

## 🚀 Mejoras Futuras

- [ ] Sincronizar actividad entre múltiples tabs (SharedWorker o BroadcastChannel API)
- [ ] Configurar tiempos desde backend en vez de hardcodeados
- [ ] Analytics: Rastrear cuántos usuarios usan refresh silencioso vs. modal
- [ ] A/B Testing: Comparar experiencia de usuario con/sin refresh silencioso
- [ ] Dark mode para modal de sesión expirada
- [ ] Notificación toast en lugar de modal para refresh silencioso (opcional)

---

## 📌 Resumen de Beneficios

✅ **Mejor UX:** Menos interrupciones para usuarios activos  
✅ **Seguridad:** Protege sesiones de usuarios inactivos  
✅ **Eficiencia:** Refresh automático sin intervención manual  
✅ **Claridad:** Countdown visual para usuarios inactivos  
✅ **Mantenibilidad:** Código modularizado y centralizado  
