import logging

def configurar_log():
    # logger = logging.getLogger(__name__)
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s", handlers=[logging.StreamHandler()]
    )

    # Asegurarte de que los loggers de uvicorn propaguen al root y que no tengan handlers propios duplicados
    logging.getLogger("uvicorn").handlers = []
    logging.getLogger("uvicorn").propagate = True

    logging.getLogger("uvicorn.error").handlers = []
    logging.getLogger("uvicorn.error").propagate = True

    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = True