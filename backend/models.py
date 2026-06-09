from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class UMLState(BaseModel):
    id: str
    name: str
    type: str = "state"
    x: int = 0
    y: int = 0


class UMLTransition(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""


class UMLActor(BaseModel):
    id: str
    name: str
    x: int = 0
    y: int = 0


class UMLUseCase(BaseModel):
    id: str
    name: str
    x: int = 0
    y: int = 0


class UMLAssociation(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""


class UMLClass(BaseModel):
    id: str
    name: str
    attributes: List[str] = []
    methods: List[str] = []
    x: int = 0
    y: int = 0


class UMLRelationship(BaseModel):
    id: str
    source: str
    target: str
    type: str = "association"
    label: str = ""


class UMLLifeline(BaseModel):
    id: str
    name: str
    x: int = 0
    y: int = 0


class UMLMessage(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    order: int = 0


class UMLAction(BaseModel):
    id: str
    name: str
    type: str = "action"  # initial, action, decision, fork, join, final
    x: int = 0
    y: int = 0


class UMLFlow(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""


class UMLModel(BaseModel):
    name: str = "AutonomousVehicle"
    diagram_type: str = "state_machine"
    description: str = ""
    author: str = ""
    safety_property: str = "hazard = TRUE => mode # Cruise"

    states: List[UMLState] = []
    transitions: List[UMLTransition] = []

    actors: List[UMLActor] = []
    use_cases: List[UMLUseCase] = []
    associations: List[UMLAssociation] = []

    classes: List[UMLClass] = []
    relationships: List[UMLRelationship] = []

    lifelines: List[UMLLifeline] = []
    messages: List[UMLMessage] = []

    actions: List[UMLAction] = []
    flows: List[UMLFlow] = []


class ConversionResponse(BaseModel):
    diagram_type: str
    tla: str
    python_code: str
    trace: List[Dict[str, object]]
    statistics: Dict[str, object]
    properties: List[Dict[str, object]]
    safety_satisfied: bool
    result: str
    warnings: List[str]
