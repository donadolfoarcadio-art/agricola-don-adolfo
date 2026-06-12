# Prototipo Web

Este prototipo es una web estática, pensada para celular y lista para nube.

## Cómo actualizar datos

1. Genera o actualiza los JSON diarios en la carpeta raíz.
2. Corre:

```powershell
& 'C:\Users\OperacionesDA\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\OperacionesDA\Documents\nuevo\build_dashboard_dataset.py'
```

Eso actualiza:

`data/dashboard-data.json`

## Cómo verla localmente

Desde la carpeta del proyecto:

```powershell
python -m http.server 4173
```

Luego abrir:

`http://localhost:4173`

## Cómo subirla a Vercel

1. Entrar a [https://vercel.com/new](https://vercel.com/new)
2. Importar este repositorio
3. Framework Preset: `Other`
4. Build Command: vacío
5. Output Directory: vacío
6. Deploy

## Nota importante

El archivo `data/dashboard-data.json` se publica tal cual, así que cuando actualices los reportes diarios solo hay que regenerar ese JSON y volver a desplegar.

## Siguiente paso recomendado

Automatizar el flujo diario:

1. Extraer Holus
2. Actualizar censo
3. Generar JSON diarios
4. Regenerar `data/dashboard-data.json`
5. Publicar automáticamente
