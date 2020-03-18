import React, { useState, useReducer } from 'react'
import { useHistory } from 'react-router-dom'
import firebase from 'firebase/app'

import 'firebase/firestore'

import Question from '../components/SelectQuestion'
import FormBox from '../components/FormBox'

const Form = ({ filledState = {}, setFormState, form }) => {
  const sequence = [
    'gender',
    'pregnant',
    'age',
    'breath',
    'fever',
    'alarmSigns',
    'riskGroup',
    'healthProfessional',
    'professionalExposure',
    'familyExposure'
  ]

  // takes an array of keys returns an object with keys and defaultStates
  const createDefaultStates = (list, defaultState) =>
    list.reduce((obj, item) => {
      obj[item] = defaultState
      return obj
    }, {})

  const [status, setStatus] = useReducer(
    (state, newState) => {
      return { ...state, ...newState }
    },
    {
      [sequence[0]]: { show: true, answer: '' },
      ...createDefaultStates(sequence.slice(1), { show: false, answer: '' }),
      ...filledState
    }
  )

  // For Stoybook
  // if (filledState) setStatus({ ...status, ...filledState })

  const [errors, setErrors] = useState(createDefaultStates(sequence, false))
  const [disabledButton, setDisabledButton] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const nextQuestion = (q, hide) => {
    const defaultState = { show: false, answer: '' }
    const i = sequence.indexOf(q)
    const valuesToReset = createDefaultStates(sequence.slice(i), defaultState)

    // if present: hide conditional question
    if (hide) valuesToReset[hide] = defaultState

    setStatus({
      ...valuesToReset,
      [q]: { show: true, answer: '' }
    })
  }

  const handleQuestion = (q, value, cbOrNextQ) => {
    if (value === null) return nextQuestion(q)
    setErrors({ ...errors, [q]: false })
    setStatus({
      [q]: { show: true, answer: value }
    })
    if (cbOrNextQ == null) return
    else if (typeof cbOrNextQ === 'function') cbOrNextQ()
    else nextQuestion(cbOrNextQ)
  }

  const handleSubmit = e => {
    e.preventDefault()
    setDisabledButton(true)

    const newErrors = errors
    let errorPresent = false
    Object.entries(status).map(([key, value]) => {
      if (value.show === true && value.answer === '') {
        newErrors[key] = true
        errorPresent = true
      } else newErrors[key] = false
    })
    setErrors({ ...errors, newErrors })

    if (!errorPresent) {
      console.log('Submit')
      postForm()
    } else {
      setDisabledButton(false)
    }
  }
  const history = useHistory()

  const postForm = async () => {
    try {
      const firestoreDocument = {
        ...status,
        reportDate: firebase.firestore.Timestamp.now()
      }
      await firebase
        .firestore()
        .collection('self-reports')
        .add(firestoreDocument)
      setFormState({ ...form, ...status })
      setDisabledButton(false)
      history.push('/success')
    } catch (error) {
      console.log(error)
      setDisabledButton(false)
      setSubmitError(true)
    }
  }

  const ageRange = ["0-13", "13-18", "18-40", "40-65", "65-100"];  

  return (
    <FormBox>
      <form onSubmit={handleSubmit}>
        <>
          <Question
            title="¿Cuál es su sexo?"
            options={[
              { value: 'male', label: 'Hombre' },
              { value: 'female', label: 'Mujer' }
            ]}
            onChange={({ value }) => {
              handleQuestion('gender', value, () => {
                if (value === 'female') nextQuestion('pregnant')
                else nextQuestion('age', 'pregnant')
              })
            }}
            value={status.gender.answer}
            error={errors.gender}
          />
        </>
        {status['pregnant'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Estás embarazada?"
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('pregnant', value, 'age')
              }}
              value={status.pregnant.answer}
              error={errors.pregnant}
            />
          </>
        )}
        {status['age'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Cuál es tu rango de edad?"
              options={ageRange.map( (element) => {
                return {
                  value: element,
                  label: element + ' años'
                }
              })}
              onChange={({ value }) => {
                handleQuestion('age', value, 'breath')
              }}
              value={status.age.answer}
              error={errors.age}
            />
          </>
        )}
        {status['breath'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Tenés síntomas respiratorios como tos o dolor de garganta?"
              subTitle="Si solo te chorrea la nariz, indicá NO."
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('breath', value, 'fever')
              }}
              value={status.breath.answer}
              error={errors.breath}
            />
          </>
        )}
        {status['fever'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="En las últimas 24 horas, ¿Tuviste fiebre de 38°C o más?"
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('fever', value, () => {
                  if (value === 'yes' && status.breath.answer === 'yes')
                    nextQuestion('alarmSigns')
                  else nextQuestion('riskGroup', 'alarmSigns')
                })
              }}
              value={status.fever.answer}
              error={errors.fever}
            />
          </>
        )}
        {status['alarmSigns'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Tenés alguno de estos signos?"
              subTitle="Grave dificultad respiratoria, sensación de ahogo, dolor de pecho, fiebre persistente mas de 72 horas, confusión o somnolencia, dolor de cabeza intenso, visión borrosa."
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('alarmSigns', value, 'riskGroup')
              }}
              value={status.alarmSigns.answer}
              error={errors.alarmSigns}
            />
          </>
        )}
        {status['riskGroup'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Pertenecés a un grupo de riesgo?"
              subTitle="Mayores de 65 años, diabetes, hipertensión, obesidad mórbida, cáncer, diálisis, asma, problemas pulmonares crónicos, problemas del corazón, uso prolongado de corticoides."
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('riskGroup', value, 'healthProfessional')
              }}
              value={status.riskGroup.answer}
              error={errors.riskGroup}
            />
          </>
        )}
        {status['healthProfessional'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="¿Sos un profesional de la salud y tenés contacto con pacientes o residentes de asilos?"
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('healthProfessional', value, () => {
                  if (value === 'yes') nextQuestion('professionalExposure')
                  else nextQuestion('familyExposure', 'professionalExposure')
                })
              }}
              value={status.healthProfessional.answer}
              error={errors.healthProfessional}
            />
          </>
        )}
        {status['professionalExposure'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="En el curso de tu trabajo sin equipo de protección, ¿tuviste contacto directo con uno en el caso confirmado?"
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('professionalExposure', value, 'familyExposure')
              }}
              value={status.professionalExposure.answer}
              error={errors.professionalExposure}
            />
          </>
        )}
        {status['familyExposure'].show && (
          <>
            <hr className="mb-5 mt-5" />
            <Question
              title="En los últimos 15 días, ¿tuviste contacto con un algún caso confirmado en su entorno cercano (familia o personas del mismo hogar)?"
              options={[
                { value: 'yes', label: 'Sí' },
                { value: 'no', label: 'No' }
              ]}
              onChange={({ value }) => {
                handleQuestion('familyExposure', value)
              }}
              value={status.familyExposure.answer}
              error={errors.familyExposure}
            />
          </>
        )}
        <hr className="mb-5 mt-5" />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={disabledButton}
        >
          {disabledButton && (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
              style={{ paddingRight: 10 }}
            ></span>
          )}
          Enviar
        </button>
        {submitError && (
          <p style={{ color: 'red', padding: 5 }}>
            Se ha producido un error. Sus entradas no se han guardado. Por
            favor, inténtelo de nuevo o póngase en contacto con nosotros.
          </p>
        )}
      </form>
    </FormBox>
  )
}

export default Form
