from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CarteraViewSet, PagoViewSet, obtener_token

router = DefaultRouter()
router.register("cartera", CarteraViewSet, basename="cartera")
router.register("pagos", PagoViewSet, basename="pagos")

urlpatterns = router.urls + [path("token/", obtener_token, name="token")]
