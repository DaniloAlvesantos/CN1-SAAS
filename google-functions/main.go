package saas

import (
	"encoding/json"
	"net/http"
	"strings"
)

type RequestData struct {
	Wight     float64 `json:"wight"`
	Intensity string
}

type ResponseData struct {
	WaterLiters    float64 `json:"water_liters"`
	SleepHours     float64 `json:"sleep_hours"`
	Recommendation string  `json:"recommendation"`
}

func HydrationMonitor(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var input RequestData
	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil || input.Wight <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Parametros invalidos"})
		return
	}

	intensity := strings.ToLower(input.Intensity)

	waterNeedML := input.Wight * 35.0
	baseSleep := 7.5
	var tip string

	switch intensity {
	case "light":
		waterNeedML += 500
		baseSleep += 0.5
		tip = "Treino leve concluido. Mantenha a hidratacao constante."
	case "moderate":
		waterNeedML += 1000
		baseSleep += 1.0
		tip = "Bom rendimento! Seu corpo precisa de mais descanso para regenerar os musculos."
	case "heavy":
		waterNeedML += 1500
		baseSleep += 2.0
		tip = "Treino intenso! Priorize o sono e consuma liquidos extras para evitar a fadiga."
	default:
		tip = "Intensidade não reconhecida. Considerando nivel basico de recuperacao."
	}

	response := ResponseData{
		WaterLiters:    waterNeedML,
		SleepHours:     baseSleep,
		Recommendation: tip,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
